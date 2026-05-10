import requests
import sqlite3
import time
from datetime import datetime

#ayqKUojPCHjQgLjjKrUtr2zPTxbkLHmy

# --- 설정 ---
AUTH_KEY = "발급받은_인증키를_입력하세요"
DB_PATH = r"D:\035\035-backend\035_database.db"

def get_exchange_rates():
    # 1. 오늘 날짜로만 조회 (7일 조회 로직 제거)
    date_str = datetime.now().strftime('%Y%m%d')
    url = "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON"
    
    params = {
        'authkey': AUTH_KEY,
        'searchdate': date_str,
        'data': 'AP01'
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        if not response.text.strip():
            print("서버에서 빈 값을 보냈습니다. 날짜나 인증키를 확인하세요.")
            return

        # 2. 내용이 있다면 출력해보기 (HTML인지 JSON인지 눈으로 확인)
        print("서버 응답 내용:", response.text)

        try:
            data = response.json()
        except Exception as e:
            print(f"JSON 변환 실패! 서버가 JSON이 아닌 텍스트를 보냈습니다: {e}")
            return
        response.raise_for_status()
        data = response.json()

        if not data:
            print(f"조회된 데이터가 없습니다. (주말/영업시간 외)")
            return

        print(f"데이터를 가져왔습니다. DB 저장 시작...")

        for item in data:
            cur_unit = item.get('cur_unit')
            cur_nm = item.get('cur_nm')
            raw_rate = item.get('deal_bas_r')

            # 2. 데이터 가공 (콤마 제거 및 100단위 보정)
            rate = float(raw_rate.replace(",", ""))
            if "(100)" in cur_unit:
                cur_unit = cur_unit.replace("(100)", "").strip()
                rate /= 100

            # 3. DB 저장
            save_to_database(cur_unit, rate, cur_nm)

    except Exception as e:
        print(f"오류 발생: {e}")

def save_to_database(unit, rate, name):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 2. 데이터 삽입 또는 업데이트
        # PRIMARY KEY가 설정되어 있어야 REPLACE가 정상 작동합니다.
        cursor.execute("""
            INSERT OR REPLACE INTO exchange_rate (currency, exchange_rate, cur_nm)
            VALUES (?, ?, ?)
        """, (unit, rate, name))

        # 3. 중요: 변경사항 확정
        conn.commit()
        # print(f"저장 완료: {unit} - {rate}") # 디버깅용 출력

    except Exception as e:
        print(f"DB 저장 중 에러 발생: {e}")
        conn.rollback() # 에러 시 되돌리기
    finally:
        conn.close()

def main():
    while True:
        try:
            if datetime.now().hour == 12 and datetime.now().minute == 0:
                print("12시 정각입니다. 환율 정보를 가져옵니다.")
                get_exchange_rates()
                time.sleep(60) # 1분마다 체크
        except KeyboardInterrupt:
            print("\n프로그램을 종료합니다.")
            break

if __name__ == "__main__":
    main()