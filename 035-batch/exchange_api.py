import requests
import pymysql  # sqlite3 대신 pymysql 사용
import time
from datetime import datetime

# --- 설정 ---
#ayqKUojPCHjQgLjjKrUtr2zPTxbkLHmy
AUTH_KEY = "ayqKUojPCHjQgLjjKrUtr2zPTxbkLHmy"

# MySQL 연결 설정 (본인의 환경에 맞게 수정하세요)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1234',  # MySQL 비밀번호 입력
    'database': 'sccot',  # 사용할 데이터베이스 이름 입력
    'charset': 'utf8mb4'
}

def get_exchange_rates():
    date_str = datetime.now().strftime('%Y%m%d')
    #date_str = '20260529'
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

        print("서버 응답 내용:", response.text)

        try:
            data = response.json()
        except Exception as e:
            print(f"JSON 변환 실패! 서버가 JSON이 아닌 텍스트를 보냈습니다: {e}")
            return

        if not data:
            print(f"조회된 데이터가 없습니다. (주말/영업시간 외)")
            return

        print(f"데이터를 가져왔습니다. DB 저장 시작...")

        for item in data:
            cur_unit = item.get('cur_unit')
            cur_nm = item.get('cur_nm')
            raw_rate = item.get('deal_bas_r')

            # 데이터 가공 (콤마 제거 및 100단위 보정)
            rate = float(raw_rate.replace(",", ""))
            if "(100)" in cur_unit:
                cur_unit = cur_unit.replace("(100)", "").strip()
                rate /= 100

            # DB 저장
            save_to_database(cur_unit, rate, cur_nm)

    except Exception as e:
        print(f"오류 발생: {e}")

def save_to_database(unit, rate, name):
    # MySQL 서버에 연결
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()

    try:
        # MySQL 문법에 맞게 'INSERT INTO ... ON DUPLICATE KEY UPDATE' 사용
        # (currency 컬럼이 PRIMARY KEY 또는 UNIQUE KEY로 지정되어 있어야 중복 시 업데이트됩니다)
        query = """
            INSERT INTO TB_EXCHANGE_RATE (currency, exchange_rate, cur_nm)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                exchange_rate = VALUES(exchange_rate),
                cur_nm = VALUES(cur_nm)
        """
        cursor.execute(query, (unit, rate, name))

        # 변경사항 확정
        conn.commit()
        # print(f"저장 완료: {unit} - {rate}") # 디버깅용 출력

    except Exception as e:
        print(f"DB 저장 중 에러 발생: {e}")
        conn.rollback() # 에러 시 되돌리기
    finally:
        cursor.close()
        conn.close()

def main():
    while True:
        try:
            now = datetime.now()
            # 12시 00분에 실행 (매초마다 체크하므로 중복 실행을 막기 위해 초단위까지 체크하면 좋으나 기존 1분 sleep 로직 유지)
            if now.hour == 12 and now.minute == 0:
                print("12시 정각입니다. 환율 정보를 가져옵니다.")
                get_exchange_rates()
                time.sleep(60) # 1분 동안 대기하여 중복 실행 방지
            
            time.sleep(1) # CPU 과부하 방지를 위해 루프마다 1초씩 쉬어줌
        except KeyboardInterrupt:
            print("\n프로그램을 종료합니다.")
            break

if __name__ == "__main__":
    main()