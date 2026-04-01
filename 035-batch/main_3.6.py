import requests
from bs4 import BeautifulSoup
import cx_Oracle
import threading
import os
import datetime

# Oracle 접속 정보
ORACLE_USER = "CRAPP"
ORACLE_PASSWORD = "coreplus01"
ORACLE_DSN = "150.136.144.102:3050/PDB1.cjlsubsvr.cjlpubvcn.oraclevcn.com"

# 반복 주기 (초)
INTERVAL = 60

# ====== 환율 크롤러 ======
def get_krw_usd_from_naver():
    url = "https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    html = resp.text

    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find('p', class_='no_today')
    if not tag:
        raise ValueError("환율 정보를 찾을 수 없습니다.")

    price_text = tag.get_text().strip()
    price_num = price_text.replace("원", "").replace(",", "")
    try:
        return float(price_num)
    except ValueError:
        raise ValueError("환율 변환에 실패했습니다: {}".format(price_text))

# ====== Oracle 저장 ======
def save_rate_to_oracle(rate):
    conn = cx_Oracle.connect(
        user=ORACLE_USER,
        password=ORACLE_PASSWORD,
        dsn=ORACLE_DSN
    )

    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO TB_CUR_EXR 
            (SEQ, CURRENCY, EXCHAGE_RATE, CREATED_DT) VALUES
            (LPAD(SQ_TB_CUR_EXR.NEXTVAL,10,'0'), 'USD', :rate, SYSDATE)
    """, {"rate": rate})

    conn.commit()
    cursor.close()
    conn.close()

# ====== 반복 실행 함수 ======
def fetch_and_save():
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        rate = get_krw_usd_from_naver()
        save_rate_to_oracle(rate)
        print("[{}] USD → KRW 환율: {}".format(now, rate))
    except Exception as e:
        print("[{}] 오류 발생: {}".format(now, e))

    # INTERVAL 초 후 다시 실행
    threading.Timer(INTERVAL, fetch_and_save).start()

# ====== 메인 ======
if __name__ == "__main__":
    print("환율 자동 저장 프로그램 시작...")
    fetch_and_save()
