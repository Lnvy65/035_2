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
