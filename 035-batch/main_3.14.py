import requests
from bs4 import BeautifulSoup
import sqlite3
import threading

# 1. 네이버에서 환율 정보 가져오기
def get_krw_usd_from_naver():
    url = "https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW"
    headers = {"User-Agent": "Mozilla/5.0"}
    
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    
    soup = BeautifulSoup(resp.text, "html.parser")
    tag = soup.find('p', class_='no_today')
    
    if not tag:
        raise ValueError("환율 정보를 찾을 수 없습니다.")

    price_text = tag.get_text().strip()
    price_num = price_text.replace("원", "").replace(",", "")
    return float(price_num)

# 2. SQLite에 저장하기
def save_rate_to_sqlite(rate):
    # 'exchange.db'라는 파일명으로 데이터베이스 연결 (없으면 자동 생성)
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # 데이터 삽입 (SQLite 문법에 맞춰 수정)
    # SEQ는 AUTOINCREMENT이므로 생략 가능하며, created_dt는 DEFAULT 값이 있어 생략 가능합니다.
    cursor.execute("""
        INSERT INTO tb_cur_exr (currency, exchange_rate)
        VALUES (?, ?)
    """, ('USD', rate))

    conn.commit()
    conn.close()

# 3. 주기적 실행 함수
def my_function():
    try:
        rate = get_krw_usd_from_naver()
        save_rate_to_sqlite(rate)
        print(f"[{threading.current_thread().name}] 현재 USD → KRW 환율: {rate} (저장 완료)")
    except Exception as e:
        print(f"오류 발생: {e}")

    # INTERVAL 초 후 다시 실행
    threading.Timer(60, my_function).start()

if __name__ == "__main__":
    print("환율 자동 저장 프로그램 시작...")
    my_function()