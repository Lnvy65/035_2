# 035

db조작시 dbeaver 필요
035-backend, 035-frontend 에서 따로 터미널 열고
npm start (백엔드에서)
npm run dev (프론트에서)
입력후 사용가능

## 추가적인 아이디어
> [!NOTE] 
> 추가적인 아이디어가 있을경우 이곳에 입력하기

* 유사 구독 서비스별 가격비교
* 구독관리 뿐만 아니라 가계부도 작성할 수 있게 가계부 탭 넣기
* 구독기간이 얼마 남지 않으면 알림 보내기
* 가족 또는 친구단위의 구독 서비스 관리 개인당 구독료 계산 및 각각에게 정산 알림 발송
* 무료체험이나 신규 이벤트 등 알림
* 기존에 저장된 가격으로 1월부터 12월까지 각 월마다 얼마 썼는지 한눈에 보기 쉽게 그래프로 보여주기
* 구독과 다른 혜택이 섞인 묶음상품 이용시 혜택을 돈으로 계산해서 실질적인 구독료를 보여줌

---
```sql
CREATE TABLE USER_SUB (
    SEQ             INTEGER PRIMARY KEY AUTOINCREMENT,
    USERNAME        TEXT NOT NULL,
    SERVICE_NM      TEXT NOT NULL,
    MONTHLY_PRICE   INTEGER,          -- 산술 연산(합계 등)을 위해 INTEGER나 REAL 추천
    NEXT_BILLING_DT TEXT,             -- 조회 성능을 위해 'YYYY-MM-DD' 형식 유지
    ANCHOR_DAY      INTEGER,          -- [추가] 원래 결제일 (예: 31일)을 기억하기 위한 용도
    BILLING_CYCLE   INTEGER,          -- [변경] 계산을 위해 '3', '6', '12' 같은 숫자(월 단위) 저장
    CATEGORY        TEXT,
    USE_YN          TEXT DEFAULT 'N',
    CREATE_DT       TEXT,
    UPDATE_DT       TEXT
);


CREATE TABLE USERS (
    SEQ         INTEGER PRIMARY KEY AUTOINCREMENT,
    ID			TEXT NOT NULL UNIQUE,
    PASSWORD    TEXT NOT NULL,
    USER_NM     TEXT NOT NULL UNIQUE,
    EMAIL		TEXT NOT NULL UNIQUE,
    ROLES       TEXT NOT NULL,
    CREATE_DT   TEXT DEFAULT (DATETIME('now', 'localtime')),
    USE_YN      TEXT DEFAULT 'N'
);
```
