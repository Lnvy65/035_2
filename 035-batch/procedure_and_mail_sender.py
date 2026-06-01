import pymysql
from pymysql.cursors import DictCursor
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import time

# 🛠️ 1. 본인의 데이터베이스 접속 정보로 변경해 주세요.
db_config = {
    'host': 'localhost',      # DB 서버 주소 (로컬 환경이면 localhost)
    'user': 'root',           # DB 사용자 계정명
    'password': '1234', # 👈 본인의 DB 비밀번호 입력
    'db': 'sccot',           # 사용 중인 스키마/데이터베이스 이름
    'charset': 'utf8mb4',
    'cursorclass': DictCursor # 결과를 딕셔너리 형태로 편하게 받기 위한 설정
}

def execute_subscription_procedure():
    connection = None
    try:
        print("🔌 데이터베이스 연결 시도 중...")
        # 2. DB 연결
        connection = pymysql.connect(**db_config)
        
        # 3. 커서 생성 및 프로시저 호출
        with connection.cursor() as cursor:
            print("🚀 프로시저 'SQ_UPDATE_USER_INFO' 실행 중...")
            
            # 💡 callproc('프로시저명') 함수로 프로시저를 직접 호출합니다.
            cursor.callproc('SQ_UPDATE_USER_INFO')
            
            # 4. 데이터 변경 사안(INSERT, UPDATE)을 DB에 최종 반영
            connection.commit()
            print("✨ 구독 갱신 및 로그 기록 작업이 성공적으로 완료되었습니다!")

    except pymysql.MySQLError as e:
        # DB 에러 발생 시 처리 (예: 컬럼 매칭 오류, 테이블 없음 등)
        print(f"❌ 데이터베이스 에러 발생: {e}")
        if connection:
            print("↩️ 변경 사항을 롤백(취소)합니다.")
            connection.rollback()
            
    except Exception as e:
        print(f"❌ 일반 에러 발생: {e}")
        
    finally:
        # 5. 작업이 끝나면 안전하게 커넥션 닫기
        if connection and connection.open: 
            connection.close()
            print("🔒 데이터베이스 연결이 안전하게 종료되었습니다.")


def send_gmail():
    # 🛠️ DB 접속 정보 설정
    db_config = {
        'host': 'localhost',
        'user': 'root',
        'password': '1234',
        'db': 'sccot',
        'charset': 'utf8mb4',
        'cursorclass': DictCursor 
    }

    # 🛠️ 설정 정보 입력
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 465 
    
    SENDER_EMAIL = "bike6tonggi@gmail.com"
    SENDER_PASSWORD = "whhj jwqe tcof ixqt" 

    try:
        # 1. DB 연결
        conn = pymysql.connect(**db_config)
        
        # 2. 커서(Cursor) 생성
        with conn.cursor() as cursor:
            # 3. SQL 쿼리 실행 (아직 이메일 안 보낸 항목들만 조회)
            sql = "SELECT * FROM tb_user_log WHERE email_yn = 'N'"
            cursor.execute(sql)
            rows = cursor.fetchall()

            if not rows:
                print("🎉 오늘 새로 발송할 구독 내역이 없습니다.")
                return

            # ===================================================
            # [1단계] 이메일별로 구독 내역 묶기 (완전 분리)
            # ===================================================
            grouped_data = {}
            for row in rows:
                email = row["EMAIL"]
                if email not in grouped_data:
                    grouped_data[email] = {
                        "USER_NM": row["USER_NM"],
                        "SUB_LIST": [],
                        "LOG_SEQS": []  # 나중에 EMAIL_YN='Y'로 일괄 업데이트하기 위해 고유 SEQ 저장
                    }
                grouped_data[email]["SUB_LIST"].append(row)
                grouped_data[email]["LOG_SEQS"].append(row["SEQ"])

            # ===================================================
            # [2단계] 묶인 상자를 열어 '이메일당 딱 한 번만' 발송
            # ===================================================
            for email, info in grouped_data.items():
                user_name = info["USER_NM"]
                sub_list = info["SUB_LIST"]
                log_seqs = info["LOG_SEQS"]
                
                # 구독 내역을 줄바꿈하며 누적
                sub_details_text = ""
                for sub in sub_list:
                    price_float = float(sub['PRICE'])
                    # 💡 값의 정수형과 실수형이 같다는 것은 뒤가 .00으로 끝난다는 뜻!
                    if price_float == int(price_float):
                        # 뒤가 .00으로 끝나면 소수점을 떼고 천 단위 쉼표만 찍음
                        price_formatted = f"{int(price_float):,}"
                    else:
                        # 소수점 아래 숫자가 살아있다면(예: 12.99) 소수점 둘째 자리까지 유지
                        price_formatted = f"{price_float:,.2f}"
                        
                    sub_details_text += f"- {sub['SERVICE_NM']}: {price_formatted} {sub['CURRENCY']}\n"
                    
                # ⚠️ 이메일 본문 양식은 반드시 왼쪽 벽에 바짝 붙여야 줄맞춤이 깨지지 않습니다.
                body = f"""안녕하세요, {user_name}님!
오늘 결제 예정인 구독 서비스 내역을 안내해 드립니다.

[구독 결제 예정 내역]
{sub_details_text}
항상 저희 서비스를 이용해 주셔서 감사합니다."""
                
                # 이메일 메시지 객체 생성 (매 이메일마다 새로 선언해야 안전함)
                msg = MIMEMultipart()
                msg['From'] = SENDER_EMAIL
                msg['To'] = email
                msg['Subject'] = "오늘 결제 예정인 구독 서비스 항목입니다."
                msg.attach(MIMEText(body, 'plain', 'utf-8'))
                
                try:
                    print(f"🚀 {email} 주소로 메일 발송 시도 중...")
                    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
                        server.login(SENDER_EMAIL, SENDER_PASSWORD)
                        server.sendmail(SENDER_EMAIL, email, msg.as_string())
                    print(f"✨ {email}님에게 이메일 전송 성공!")
                    
                    # 💡 [보너스] 메일 발송에 성공했으니, 해당 데이터들의 EMAIL_YN을 'Y'로 업데이트하여 중복 발송 차단!
                    # IN 절을 사용해 한 번에 묶어서 업데이트합니다. (예: WHERE SEQ IN (1, 2, 3))
                    format_strings = ','.join(['%s'] * len(log_seqs))
                    update_sql = f"UPDATE tb_user_log SET email_yn = 'Y' WHERE seq IN ({format_strings})"
                    cursor.execute(update_sql, tuple(log_seqs))
                    conn.commit()
                    print(f"💾 DB 상태 업데이트 완료 (EMAIL_YN -> 'Y')")
                    
                except Exception as send_error:
                    print(f"❌ {email} 이메일 발송 또는 DB 반영 실패: {send_error}")

    except Exception as e:
        print(f"❌ 데이터베이스 또는 커넥션 에러 발생: {e}")

    finally:
        # 6. 연결 닫기 (필수)
        if 'conn' in locals() and conn.open:
            conn.close()
            print("🔒 DB 연결 종료.")


def main():
    while True:
        try:
            # 프로그램 실행
            now = datetime.now()
            # 9시 00분에 실행
            if now.hour == 9 and now.minute == 0:
                print("9시 정각입니다. 프로시저 작동및 이메일을 보냅니다.")
                execute_subscription_procedure()
                send_gmail()
                time.sleep(60) # 1분 동안 대기하여 중복 실행 방지
            time.sleep(1) # CPU 과부하 방지를 위해 루프마다 1초씩 쉬어줌
        except KeyboardInterrupt:
            print("\n프로그램을 종료합니다.")
            break

if __name__ == "__main__":
    main()