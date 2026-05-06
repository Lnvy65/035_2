# https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=ayqKUojPCHjQgLjjKrUtr2zPTxbkLHmy&searchdate=20260428&data=AP01

import requests
import time
from datetime import datetime
import sqlite3

# 발급받은 인증키를 여기에 입력하세요
AUTH_KEY = "ayqKUojPCHjQgLjjKrUtr2zPTxbkLHmy"
# 데이터 타입 (JSON 권장)
DATA_TYPE = "AP01" 

def get_exchange_rates():
    url = "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON"
    
    params = {
        'authkey': AUTH_KEY,
        'data': DATA_TYPE
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print("API 실패")
        return

    data = response.json()

    for item in data:
        rate = float(item['deal_bas_r'].replace(",", ""))
        unit = item['cur_unit']

        if "(100)" in unit:
            unit = unit.replace("(100)", "")
            rate /= 100

        save_to_database({
            'cur_unit': unit,
            'deal_bas_r': rate,
            'cur_nm': item['cur_nm']
        })

def save_to_database(data):
    conn = sqlite3.connect("../035-backend/035_database.db")
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO exchange_rate (currency, exchange_rate, cur_nm)
        VALUES (?, ?, ?)
    """, (data['cur_unit'], data['deal_bas_r'], data['cur_nm']))
    conn.commit()
    conn.close()




def main():
    while True:
        if datetime.now().hour == 10 and datetime.now().minute == 0:
            print("10시 정각입니다. 환율 정보를 가져옵니다.")
            get_exchange_rates()
        time.sleep(60)  # 1분마다 체크

if __name__ == "__main__":
    main()