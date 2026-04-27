# https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=ayqKUojPCHjQgLjjKrUtr2zPTxbkLHmy&searchdate=20260428&data=AP01

import requests
import time
from datetime import datetime

# 발급받은 인증키를 여기에 입력하세요
AUTH_KEY = "ayqKUojPCHjQgLjjKrUtr2zPTxbkLHmy"
# 조회할 날짜 (YYYYMMDD 형식, 생략 시 최신 데이터)
#DATETTIME = 20260427
# 데이터 타입 (JSON 권장)
DATA_TYPE = "AP01" 

def get_exchange_rates():
    # API 요청 주소
    url = "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON"
    
    # 오늘 날짜 (주말이나 공휴일에는 데이터가 없을 수 있습니다)
    # searchdate 파라미터를 생략하면 최신 데이터를 가져옵니다.
    params = {
        'authkey': AUTH_KEY,
        #'searchdate': DATETTIME,
        'data': DATA_TYPE
    }

    try:
        response = requests.get(url, params=params, verify=False) # SSL 인증서 이슈 발생 시 verify=False
        
        if response.status_code == 200:
            data = response.json()
            
            if not data:
                print(f"[{datetime.now()}] 데이터가 없습니다. (영업시간 외 또는 공휴일)")
                return

            print(f"[{datetime.now()}] 환율 정보를 가져왔습니다. (총 {len(data)}개 통화)")
            print("-" * 50)
            for item in data:
                # 결과값 출력 (통화코드, 통화명, 매매기준율)
                print(f"통화: {item['cur_unit']} ({item['cur_nm']}) | 환율: {item['deal_bas_r']}")
            print("-" * 50)
        else:
            print(f"API 요청 실패: {response.status_code}")
            
    except Exception as e:
        print(f"오류 발생: {e}")

def main():
    print("환율 모니터링을 시작합니다. (10분 간격)")
    while True:
        get_exchange_rates()
        # 600초(10분) 대기
        time.sleep(600)

if __name__ == "__main__":
    main()