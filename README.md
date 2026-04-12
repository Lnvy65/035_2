# 035

**서버 안열렸을 시 아이디에 ui-test 입력 (비밀번호 필요없음)**
* db조작시 dbeaver 필요
* 035-backend, 035-frontend 에서 따로 터미널 열고
npm start (백엔드에서)
입력후 사용가능
---

<details>
    <summary>최경욱</summary>
    
    --cell클릭시 수정창 팝업 만들기--  
    alert SweetAlert2로 바꾸기
    우측 하단 알림 관리자일시 알림글 추가 가능한 버튼? 만들기  
    외화 계산후 구독금액 보여주기  
    https://www.hanafnapimarket.com/#/apis/guide?apiId=hbk00004
</details>
<details>
    <summary>류준상</summary>

    이벤트 페이지 추가하기
        
</details>
<details>
    <summary>최주형</summary>

        
</details>
<details>
    <summary>김태율</summary>

        
</details>
<details>
    <summary>이주영</summary>

        
</details>


## 추가적인 아이디어
> [!NOTE] 
> 추가적인 아이디어가 있을경우 이곳에 입력하기

> 프로그램으로 가능한것 
* 가족 또는 친구단위의 구독 서비스 관리 드롭다운으로 몇명 나눌건지 선택 가능하게끔 만들기 (추가나 수정시 같이 뜨게하면 되지않을까....)
* 구독기간이 얼마 남지 않으면 알림 보내기 (백엔드)
* 기존에 저장된 가격으로 1월부터 12월까지 각 월마다 얼마 썼는지 한눈에 보기 쉽게 그래프로 보여주기 (분석 페이지로 나누기)
>
>

> 관리자가 직접 추가해야하는것
* 유사 구독 서비스별 가격비교
* 무료체험이나 신규 이벤트 등 알림
* 구독과 다른 혜택이 섞인 묶음상품 이용시 혜택을 돈으로 계산해서 실질적인 구독료를 보여줌
>
>

> 후순위로 개발할 아이디어
* 구독관리 뿐만 아니라 가계부도 작성할 수 있게 가계부 탭 넣기
  

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
