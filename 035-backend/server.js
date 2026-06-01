const express = require('express');
//const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mysql = require('mysql2/promise');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'this_is_carneky_world';

// 1. 경로 설정 (중요: 모든 로직에서 이 변수를 사용합니다)
const UPLOAD_SUB_DIR = "uploads/profile";
const UPLOAD_PATH = path.join(__dirname, UPLOAD_SUB_DIR);
app.use('/profile', express.static(UPLOAD_PATH));

// 업로드 폴더 없으면 생성
if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

// 2. Multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_PATH); // 통일된 경로 사용
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `profile_${Date.now()}${ext}`;
        cb(null, filename);
    }
});

// [수정된 부분] 이벤트 이미지 전용 업로드 경로 및 Multer 설정 추가
const EVENT_UPLOAD_DIR = "uploads/event";
const EVENT_UPLOAD_PATH = path.join(__dirname, EVENT_UPLOAD_DIR);
app.use('/event_img', express.static(EVENT_UPLOAD_PATH));

if (!fs.existsSync(EVENT_UPLOAD_PATH)) {
    fs.mkdirSync(EVENT_UPLOAD_PATH, { recursive: true });
}

const eventStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, EVENT_UPLOAD_PATH); 
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `event_${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const eventUpload = multer({
    storage: eventStorage,
    limits: { fileSize: 100 * 1024 * 1024 },
});
// [수정된 부분] 끝

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
});

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

/* sqlite 안녕~
let db;
(async () => {
    db = await open({ filename: './035_database.db', driver: sqlite3.Database });
})();
*/

let db;

(async () => {
    db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '1234',
        database: 'sccot'
    });

    console.log('MySQL 연결 성공');
})();

// 공통 함수: 물리적 파일 삭제
const deletePhysicalFile = (fileName) => {
    if (!fileName) return;
    const filePath = path.join(UPLOAD_PATH, fileName); // 정확한 경로 조합
    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) console.error("파일 삭제 에러:", err);
            else console.log("파일 삭제 성공:", fileName);
        });
    }
};


// -----------------------------------------------------------------------------------------------------------
// /rest/user/selectpfpdata
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/selectpfpdata', async (req, res) => {

    let accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({ message: "액세스토큰이 없습니다." });
    }

    console.log("/rest/user/selectpfpdata 호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const [rows] = await db.execute(
            `SELECT IMG_NM 
               FROM TB_USERS 
              WHERE ID = ?`,
            [userId]
        );

        const user = rows[0];

        const formattedUserPfp = {
            IMG_NM: user?.IMG_NM || null,
            picture: user?.IMG_NM
                ? `http://localhost:5000/profile/${user.IMG_NM}`
                : null
        };

        res.json({ userpfp: formattedUserPfp });

    } catch (error) {
        res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/updateprofile
// -----------------------------------------------------------------------------------------------------------
app.post(
  '/rest/user/updateprofile',
  upload.single("imgMyProfile"),
  async (req, res) => {

    let accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({ message: "액세스토큰이 없습니다." });
    }

    const { userId, password, email, user_nm, isImageDeleted } = req.body;
    const imgMyProfile = req.file;

    if (!userId) {
      return res.status(400).json({ message: "아이디를 입력해주세요." });
    }

    console.log("/rest/user/updateprofile 호출됐습니다 : ", accessToken);

    try {
      // 1. 토큰 검증
      jwt.verify(accessToken, SECRET_KEY);

      // 2. 기존 이미지 조회 (MySQL)
      const [rows] = await db.execute(
        'SELECT IMG_NM FROM TB_USERS WHERE ID = ?',
        [userId]
      );

      const oldFileName = rows[0]?.IMG_NM || null;

      let newImgName = oldFileName;

      // 3. 이미지 처리
      if (imgMyProfile) {
        newImgName = imgMyProfile.filename;

        if (oldFileName) deletePhysicalFile(oldFileName);
      }

      if (isImageDeleted === 'true') {
        newImgName = null;

        if (oldFileName) deletePhysicalFile(oldFileName);
      }

      // 4. 한 번에 UPDATE (핵심)
      await db.execute(
        `
        UPDATE TB_USERS
           SET password = COALESCE(?, password),
               email = COALESCE(?, email),
               USER_NM = COALESCE(?, USER_NM),
               IMG_NM = ?
         WHERE ID = ?
        `,
        [
          password || null,
          email || null,
          user_nm || null,
          newImgName,
          userId
        ]
      );

      res.json({
        userId,
        email,
        user_nm,
        imgMyProfile: newImgName,
        message: "개인설정저장 성공!"
      });

    } catch (error) {
      res.status(401).json({
        stt: -1,
        message: error.message
      });
    }
  }
);


// -----------------------------------------------------------------------------------------------------------
// /rest/auth/login
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/auth/login', async (req, res) => {
    

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "아이디와 비밀번호를 입력해주세요."
        });
    }

    try {

        const [rows] = await db.execute(
            'SELECT * FROM TB_USERS WHERE ID = ?',
            [username]
        );

        const user = rows[0];

        if (!user) {
            return res.status(401).json({
                message: "아이디 또는 비밀번호가 일치하지 않습니다."
            });
        }

        if (user.USE_YN === "N") {
            return res.status(403).json({
                message: "인증되지 않은 계정입니다."
            });
        }

        // (현재는 평문 비교 - 나중에 bcrypt로 변경 권장)
        if (user.PASSWORD !== password) {
            return res.status(401).json({
                message: "아이디 또는 비밀번호가 일치하지 않습니다."
            });
        }

        const accessToken = jwt.sign(
            {
                id: user.ID,
                username: user.USER_NM,
                roles: user.ROLES,
                email: user.EMAIL
            },
            SECRET_KEY,
            { expiresIn: '2h' }
        );

        const refreshToken = jwt.sign(
            {
                id: user.ID,
                username: user.USER_NM,
                roles: user.ROLES,
                email: user.EMAIL
            },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        return res.json({
            accessToken,
            user: {
                id: user.ID,
                username: user.USER_NM,
                roles: user.ROLES
            },
            message: "로그인 성공!"
        });

    } catch (error) {
        return res.status(500).json({
            stt: -1,
            message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/auth/logout
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/auth/logout', async (req, res) => {    
    
    // 1. Header에서 토큰 가져오기 (보통 'authorization' 필드를 사용합니다)
    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "액세스토큰이 헤더에 없습니다." });
    }

    console.log("/rest/auth/logout 호출됐습니다 : ", accessToken);

    try {
            res.cookie('refreshToken', '', {
                httpOnly: true,
                maxAge: 0,
                sameSite: 'lax'
            });            

            res.json(
                {
                    accessToken : '',
                    user: '',  
                    message: "로그아웃 성공!"
                }
            );
    } catch (error) {
        res.status(401).json({ 
                stt: -1,
                message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/auth/refresh
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/auth/refresh', async (req, res) => {

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "리프레시 토큰이 없습니다. 다시 로그인해주세요."
        });
    }

    try {
        // 1. 토큰 검증
        const decoded = jwt.verify(refreshToken, SECRET_KEY);

        // 2. 유저 조회 (MySQL)
        const [rows] = await db.execute(
            'SELECT * FROM TB_USERS WHERE ID = ?',
            [decoded.id]
        );

        const user = rows[0];

        if (!user) {
            return res.status(401).json({
                message: "유저 정보가 존재하지 않습니다."
            });
        }

        // 3. access token 재발급
        const accessToken = jwt.sign(
            {
                id: user.ID,
                username: user.USER_NM,
                roles: user.ROLES,
                email: user.EMAIL
            },
            SECRET_KEY,
            { expiresIn: '2h' }
        );

        return res.json({
            accessToken,
            user: {
                id: user.ID,
                username: user.USER_NM,
                roles: user.ROLES,
                email: user.EMAIL
            },
            message: "리프레시 성공!"
        });

    } catch (error) {
        return res.status(401).json({
            stt: -1,
            message: "토큰이 만료되었거나 유효하지 않습니다."
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/alluser
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/alluser', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({
            message: "액세스토큰이 헤더에 없습니다."
        });
    }

    console.log("/rest/user/alluser 호출됐습니다 : ", accessToken);

    const { keyword } = req.body;

    try {
        // 1. 토큰 검증
        jwt.verify(accessToken, SECRET_KEY);

        let query = 'SELECT * FROM TB_USERS';
        let params = [];

        // 2. 검색 조건
        if (keyword && keyword.trim() !== "") {
            query += `
                WHERE user_nm LIKE ?
                   OR roles LIKE ?
                   OR email LIKE ?
            `;

            const searchKeyword = `%${keyword}%`;
            params.push(searchKeyword, searchKeyword, searchKeyword);
        }

        // 3. 정렬
        query += ' ORDER BY ID DESC';

        // 4. MySQL 조회
        const [rows] = await db.execute(query, params);

        return res.json({
            user: rows,
            message: keyword
                ? `"${keyword}" 검색 결과 조회 성공!`
                : "모든 사용자조회 성공!"
        });

    } catch (error) {
        return res.status(401).json({
            stt: -1,
            message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/modify
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/modifyuser', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({
            message: "액세스토큰이 헤더에 없습니다."
        });
    }

    console.log("/rest/user/modify 호출됐습니다 : ", accessToken);

    const { userId, userName, roles, email, use_yn } = req.body;

    if (!userId) {
        return res.status(400).json({
            message: "아이디를 입력해주세요."
        });
    }

    try {
        // 1. 토큰 검증
        jwt.verify(accessToken, SECRET_KEY);

        // 2. 업데이트 (MySQL)
        const [result] = await db.execute(
            `
            UPDATE TB_USERS
               SET user_nm = ?,
                   roles = ?,
                   email = ?,
                   use_yn = ?
             WHERE id = ?
            `,
            [userName, roles, email, use_yn, userId]
        );

        // 3. 결과 처리
        if (result.affectedRows > 0) {
            return res.json({
                updatedId: userId,
                message: "사용자 정보 수정 성공!"
            });
        } else {
            return res.status(404).json({
                message: "수정할 사용자를 찾지 못했습니다."
            });
        }

    } catch (error) {
        return res.status(401).json({
            stt: -1,
            message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/deleteuser
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/deleteuser', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({
            message: "액세스토큰이 헤더에 없습니다."
        });
    }

    console.log("/rest/user/deleteuser 호출됐습니다 : ", accessToken);

    const { id } = req.body;

    if (!id) {
        return res.status(400).json({
            message: "Id를 입력해주세요."
        });
    }

    try {
        // 1. 토큰 검증
        jwt.verify(accessToken, SECRET_KEY);

        // 2. MySQL DELETE
        const [result] = await db.execute(
            'DELETE FROM TB_USERS WHERE id = ?',
            [id]
        );

        // 3. 결과 처리
        if (result.affectedRows > 0) {
            return res.json({
                deletedId: id,
                message: "사용자 정보 삭제 성공!"
            });
        } else {
            return res.status(404).json({
                message: "삭제할 사용자를 찾지 못했습니다."
            });
        }

    } catch (error) {
        return res.status(401).json({
            stt: -1,
            message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/add
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/adduser', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({
            message: "액세스토큰이 헤더에 없습니다."
        });
    }

    console.log("/rest/user/add 호출됐습니다 : ", accessToken);

    const { userId, password, roles, email, use_yn, userName } = req.body;

    if (!userId) {
        return res.status(400).json({
            message: "아이디를 입력해주세요."
        });
    }

    try {
        // 1. 토큰 검증
        jwt.verify(accessToken, SECRET_KEY);

        // 2. MySQL INSERT
        const [result] = await db.execute(
            `
            INSERT INTO TB_USERS (
                ID,
                USER_NM,
                PASSWORD,
                ROLES,
                EMAIL,
                USE_YN
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [userId, userName, password, roles, email, use_yn]
        );

        // 3. 결과 처리
        if (result.affectedRows > 0) {
            return res.json({
                insertedId: userId,
                message: "사용자 생성 성공!"
            });
        } else {
            return res.status(400).json({
                message: "사용자 생성 실패"
            });
        }

    } catch (error) {
        return res.status(401).json({
            stt: -1,
            message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/signup/signup
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/signup/signup', async (req, res) => {

    const { userId, password, userName, email } = req.body;

    try {

        // 1. 아이디 중복 체크 (alias 필수)
        const [rows] = await db.execute(
            'SELECT COUNT(*) AS cnt FROM TB_USERS WHERE ID = ?',
            [userId]
        );

        if (rows[0].cnt > 0) {
            return res.status(400).json({
                message: "아이디 중복"
            });
        }

        // 2. 회원가입 (MySQL)
        const [result] = await db.execute(
            `
            INSERT INTO TB_USERS (
                ID,
                PASSWORD,
                USER_NM,
                EMAIL,
                ROLES
            ) VALUES (?, ?, ?, ?, 'USER')
            `,
            [userId, password, userName, email]
        );

        // 3. 결과 처리
        if (result.affectedRows > 0) {
            return res.json({
                message: "계정 생성 성공!"
            });
        } else {
            return res.status(500).json({
                message: "계정 생성 실패"
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "서버 오류"
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectsum
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectsum', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectsum 호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT 
                ROUND(SUM(us.MONTHLY_PRICE * er.EXCHANGE_RATE)) AS sum,
                COUNT(*) AS count
            FROM TB_USER_SUB us
            LEFT JOIN (
                SELECT er1.*
                FROM TB_EXCHANGE_RATE er1
                INNER JOIN (
                    SELECT CURRENCY, MAX(CREATE_DT) AS max_dt
                    FROM TB_EXCHANGE_RATE
                    GROUP BY CURRENCY
                ) er2
                ON er1.CURRENCY = er2.CURRENCY
                AND er1.CREATE_DT = er2.max_dt
            ) er
            ON us.CURRENCY = er.CURRENCY
            WHERE us.USE_YN = 'Y'
              AND us.USER_ID = ?
        `;

        const [rows] = await db.execute(query, [userId]);

        return res.json({
            result: rows[0]
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectmonthlysum
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectmonthlysum', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectmonthlysum 호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT 
                ROUND(SUM(us.MONTHLY_PRICE * er.EXCHANGE_RATE)) AS sum
            FROM TB_USER_SUB us
            LEFT JOIN (
                SELECT er1.*
                FROM TB_EXCHANGE_RATE er1
                INNER JOIN (
                    SELECT CURRENCY, MAX(CREATE_DT) AS max_dt
                    FROM TB_EXCHANGE_RATE
                    GROUP BY CURRENCY
                ) er2
                ON er1.CURRENCY = er2.CURRENCY
                AND er1.CREATE_DT = er2.max_dt
            ) er
            ON us.CURRENCY = er.CURRENCY
            WHERE DATE_FORMAT(DATE(us.NEXT_BILLING_DT), '%Y-%m') = DATE_FORMAT(DATE(NOW()), '%Y-%m')
              AND us.USE_YN = 'Y'
              AND us.USER_ID = ?
        `;

        const [rows] = await db.execute(query, [userId]);

        return res.json({
            result: rows[0]
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectdate    같은날 서비스가 여러개라면? 어떻게 처리할건지
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectdate', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectdate 호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT  CAST(DATE(NEXT_BILLING_DT) AS CHAR) AS NEXT_BILLING_DT
                   ,SERVICE_NM
              FROM TB_USER_SUB
             WHERE NEXT_BILLING_DT >= CURDATE()
               AND USE_YN = 'Y'
               AND USER_ID = ?
          ORDER BY NEXT_BILLING_DT ASC
             LIMIT 1
        `;

        const [rows] = await db.execute(query, [userId]);

        return res.json({
            result: rows
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});



// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectsublist
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectsublist', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectsublist 호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT DISTINCT
                   us.SEQ,
                   us.USER_ID,
                   us.SERVICE_NM,
                   us.MONTHLY_PRICE,
                   CAST(DATE(us.NEXT_BILLING_DT) AS CHAR) AS NEXT_BILLING_DT,
                   us.ANCHOR_DAY,
                   us.BILLING_CYCLE,
                   us.CATEGORY,
                   us.USE_YN,
                   CAST(DATE(us.CREATE_DT) AS CHAR) as CREATE_DT,
                   CAST(DATE(us.UPDATE_DT) AS CHAR) as UPDATE_DT,
                   er.CUR_NM
            FROM TB_USER_SUB us
            LEFT JOIN TB_EXCHANGE_RATE er
              ON us.currency = er.currency
            WHERE us.USER_ID = ?
        `;

        const [rows] = await db.execute(query, [userId]);

        return res.json({
            result: rows
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectsubkrlist
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectsubkrlist', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectsubkrlist 호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT DISTINCT
                   us.SEQ,
                   us.USER_ID,
                   us.SERVICE_NM,
                   ROUND(us.MONTHLY_PRICE * er.EXCHANGE_RATE) AS MONTHLY_PRICE,
                   CAST(DATE(us.NEXT_BILLING_DT) AS CHAR) AS NEXT_BILLING_DT,
                   us.ANCHOR_DAY,
                   us.BILLING_CYCLE,
                   us.CATEGORY,
                   us.USE_YN,
                   CAST(DATE(us.CREATE_DT) AS CHAR) as CREATE_DT,
                   CAST(DATE(us.UPDATE_DT) AS CHAR) as UPDATE_DT,
                   '한국 원' AS CUR_NM
            FROM TB_USER_SUB us
            LEFT JOIN (
                SELECT er1.*
                FROM TB_EXCHANGE_RATE er1
                INNER JOIN (
                    SELECT CURRENCY, MAX(CREATE_DT) AS max_dt
                    FROM TB_EXCHANGE_RATE
                    GROUP BY CURRENCY
                ) er2
                ON er1.CURRENCY = er2.CURRENCY
                AND er1.CREATE_DT = er2.max_dt
            ) er
            ON us.CURRENCY = er.CURRENCY
            WHERE us.USER_ID = ?
        `;

        const [rows] = await db.execute(query, [userId]);

        return res.json({
            result: rows
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectsubchart
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectsubchart', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectsubchart 호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT 
                us.CATEGORY,
                ROUND(SUM(us.MONTHLY_PRICE * er.EXCHANGE_RATE)) AS TOTAL_PRICE
            FROM TB_USER_SUB us
            LEFT JOIN (
                SELECT er1.*
                FROM TB_EXCHANGE_RATE er1
                INNER JOIN (
                    SELECT CURRENCY, MAX(CREATE_DT) AS max_dt
                    FROM TB_EXCHANGE_RATE
                    GROUP BY CURRENCY
                ) er2
                ON er1.CURRENCY = er2.CURRENCY
                AND er1.CREATE_DT = er2.max_dt
            ) er
            ON us.CURRENCY = er.CURRENCY
            WHERE us.USER_ID = ?
              AND us.USE_YN = 'Y'
            GROUP BY us.CATEGORY
            ORDER BY TOTAL_PRICE DESC
        `;

        const [rows] = await db.execute(query, [userId]);

        return res.json({
            result: rows
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/deletesub
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/deletesub', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/deletesub 호출됐습니다 : ", accessToken);

    const seq = req.body.seq || req.body.SEQ;

    if (!seq) {
        return res.status(400).json({
            message: "SEQ가 없습니다."
        });
    }

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const [result] = await db.execute(
            'DELETE FROM TB_USER_SUB WHERE seq = ?',
            [seq]
        );

        if (result.affectedRows > 0) {
            return res.json({
                message: "삭제 성공!"
            });
        } else {
            return res.status(404).json({
                message: "대상 없음"
            });
        }

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/insertsub
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/insertsub', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "토큰이 없습니다." });
    }

    console.log("/rest/main/insertsub 호출됐습니다 : ", accessToken);

    const {
        userId,
        SERVICE_NM,
        MONTHLY_PRICE,
        CUR_NM,
        ANCHOR_DAY,
        BILLING_CYCLE,
        CATEGORY
    } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        // -----------------------------
        // 1. 다음 결제일 계산 (수정 버전)
        // -----------------------------
        const calculateNextBillingDate = (anchorDay, billingCycle) => {
            const now = new Date();

            let targetDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                anchorDay
            );

            if (targetDate <= now) {
                targetDate = new Date(
                    now.getFullYear(),
                    now.getMonth() + Number(billingCycle),
                    anchorDay
                );
            }

            const lastDay = new Date(
                targetDate.getFullYear(),
                targetDate.getMonth() + 1,
                0
            ).getDate();

            const finalDay = Math.min(anchorDay, lastDay);

            const finalDate = new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                finalDay
            );

            const y = finalDate.getFullYear();
            const m = String(finalDate.getMonth() + 1).padStart(2, '0');
            const d = String(finalDate.getDate()).padStart(2, '0');

            return `${y}-${m}-${d}`;
        };

        const nextBillingDt = calculateNextBillingDate(
            Number(ANCHOR_DAY),
            BILLING_CYCLE
        );

        // -----------------------------
        // 2. MySQL INSERT
        // -----------------------------
        const query = `
            INSERT INTO TB_USER_SUB (
                USER_ID,
                SERVICE_NM,
                MONTHLY_PRICE,
                CURRENCY,
                NEXT_BILLING_DT,
                ANCHOR_DAY,
                BILLING_CYCLE,
                CATEGORY,
                USE_YN,
                CREATE_DT
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
        `;

        const params = [
            userId,
            SERVICE_NM,
            MONTHLY_PRICE,
            CUR_NM,
            nextBillingDt,
            ANCHOR_DAY,
            BILLING_CYCLE,
            CATEGORY,
            'Y'
        ];

        const [result] = await db.execute(query, params);

        return res.status(200).json({
            success: true,
            SEQ: result.insertId,
            message: "구독 정보가 저장되었습니다!"
        });

    } catch (error) {
        console.error("저장 중 오류 발생:", error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "유효하지 않은 토큰입니다."
            });
        }

        return res.status(500).json({
            message: "서버 내부 오류가 발생했습니다."
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/updatesub
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/updatesub', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "토큰이 없습니다." });
    }

    console.log("/rest/main/updatesub 호출됐습니다 : ", accessToken);

    const {
        userId,
        SERVICE_NM,
        MONTHLY_PRICE,
        CUR_NM,
        ANCHOR_DAY,
        BILLING_CYCLE,
        CATEGORY,
        SEQ,
        NEXT_BILLING_DT,
        USE_YN
    } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            UPDATE TB_USER_SUB
               SET SERVICE_NM = ?,
                   MONTHLY_PRICE = ?,
                   CURRENCY = ?,
                   NEXT_BILLING_DT = ?,
                   ANCHOR_DAY = ?,
                   BILLING_CYCLE = ?,
                   CATEGORY = ?,
                   USE_YN = ?,
                   UPDATE_DT = CURDATE()
             WHERE SEQ = ?
               AND USER_ID = ?
        `;

        const params = [
            SERVICE_NM,
            MONTHLY_PRICE,
            CUR_NM,
            NEXT_BILLING_DT,
            ANCHOR_DAY,
            BILLING_CYCLE,
            CATEGORY,
            USE_YN,
            SEQ,
            userId
        ];

        const [result] = await db.execute(query, params);

        if (result.affectedRows > 0) {
            return res.status(200).json({
                success: true,
                SEQ,
                message: "구독 정보가 수정되었습니다!"
            });
        } else {
            return res.status(404).json({
                message: "수정할 데이터가 없습니다."
            });
        }

    } catch (error) {
        console.error("수정 중 오류 발생:", error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "유효하지 않은 토큰입니다."
            });
        }

        return res.status(500).json({
            message: "서버 내부 오류가 발생했습니다."
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/event/list 
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/event/list', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({
            message: "액세스토큰이 헤더에 없습니다."
        });
    }

    console.log("/rest/event/list  호출됐습니다 : ", accessToken);

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT 
                SEQ,
                TITLE,
                CONTENT,
                IMG_NAME,
                CAST(DATE(CREATE_DT) AS CHAR ) AS CREATE_DT
            FROM TB_EVENT
            ORDER BY SEQ DESC
        `;

        const [rows] = await db.execute(query);

        return res.json({
            result: rows,
            message: "이벤트 조회 성공"
        });

    } catch (error) {
        return res.status(401).json({
            stt: -1,
            message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/event/add 
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/event/add', eventUpload.single('image'), async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({
            message: "액세스토큰이 헤더에 없습니다."
        });
    }

    console.log("/rest/event/add  호출됐습니다 : ", accessToken);

    const { title, content } = req.body;
    const imgName = req.file ? req.file.filename : null;

    try {
        const decoded = jwt.verify(accessToken, SECRET_KEY);

        // -----------------------------
        // 1. 권한 체크
        // -----------------------------
        if (decoded.roles !== "ADMIN") {
            return res.status(403).json({
                message: "권한이 없습니다."
            });
        }

        // -----------------------------
        // 2. INSERT (MySQL)
        // -----------------------------
        const query = `
            INSERT INTO TB_EVENT (TITLE, CONTENT, IMG_NAME, CREATE_DT)
            VALUES (?, ?, ?, CURDATE())
        `;

        const params = [title, content, imgName];

        const [result] = await db.execute(query, params);

        if (result.affectedRows > 0) {
            return res.json({
                message: "이벤트 추가 성공",
                SEQ: result.insertId
            });
        }

        return res.status(500).json({
            message: "이벤트 추가 실패"
        });

    } catch (error) {
        return res.status(401).json({
            stt: -1,
            message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/event/delete 
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/event/delete', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({
            message: "액세스토큰이 헤더에 없습니다."
        });
    }

    console.log("/rest/event/delete  호출됐습니다 : ", accessToken);

    const { seq } = req.body;

    if (!seq) {
        return res.status(400).json({
            message: "SEQ가 없습니다."
        });
    }

    try {
        const decoded = jwt.verify(accessToken, SECRET_KEY);

        if (decoded.roles !== "ADMIN") {
            return res.status(403).json({
                message: "권한이 없습니다."
            });
        }

        const query = `
            DELETE FROM TB_EVENT
            WHERE SEQ = ?
        `;

        const [result] = await db.execute(query, [seq]);

        if (result.affectedRows > 0) {
            return res.json({
                message: "이벤트 삭제 성공"
            });
        }

        return res.status(404).json({
            message: "삭제할 이벤트를 찾지 못했습니다."
        });

    } catch (error) {
        return res.status(401).json({
            stt: -1,
            message: error.message
        });
    }
});



// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectcurnm
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectcurnm', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectcurnm  호출됐습니다 : ", accessToken);

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT 
                CURRENCY,
                CUR_NM
            FROM TB_EXCHANGE_RATE
            GROUP BY CURRENCY, CUR_NM
            ORDER BY CUR_NM DESC
        `;

        const [rows] = await db.execute(query);

        return res.json({
            result: rows
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectsubchartdata
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectsubchartdata', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectsubchartdata  호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        // ⭐ GROUP BY를 SELECT의 별칭인 'date'로 일치시켜 수정했습니다.
        const query = `
            SELECT 
                ROUND(SUM(ul.PRICE * er.EXCHANGE_RATE)) AS sum,
                CAST(DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m') AS CHAR) AS date
            FROM TB_USER_LOG ul
            LEFT JOIN (
                SELECT er1.*
                FROM TB_EXCHANGE_RATE er1
                INNER JOIN (
                    SELECT CURRENCY, MAX(CREATE_DT) AS max_dt
                    FROM TB_EXCHANGE_RATE
                    GROUP BY CURRENCY
                ) er2
                ON er1.CURRENCY = er2.CURRENCY
                AND er1.CREATE_DT = er2.max_dt
            ) er
            ON ul.CURRENCY = er.CURRENCY
            WHERE ul.USER_ID = ?
              AND ul.CREATE_DT >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
            GROUP BY date
            ORDER BY date ASC
        `;

        const [rows] = await db.execute(query, [userId]);

        return res.json({
            result: rows
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectavg
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectavg', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectavg  호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT 
                SUM(monthly_sum) AS payforyear,
                AVG(monthly_sum) AS avg
            FROM (
                SELECT 
                    ROUND(SUM(ul.PRICE * er.EXCHANGE_RATE)) AS monthly_sum,
                    DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m') AS ym
                FROM TB_USER_LOG ul
                LEFT JOIN (
                    SELECT er1.*
                    FROM TB_EXCHANGE_RATE er1
                    INNER JOIN (
                        SELECT CURRENCY, MAX(CREATE_DT) AS max_dt
                        FROM TB_EXCHANGE_RATE
                        GROUP BY CURRENCY
                    ) er2
                    ON er1.CURRENCY = er2.CURRENCY
                    AND er1.CREATE_DT = er2.max_dt
                ) er
                ON ul.CURRENCY = er.CURRENCY
                WHERE ul.USER_ID = ?
                  AND ul.CREATE_DT >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
                GROUP BY DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m')
            ) t
        `;

        const [rows] = await db.execute(query, [userId]);

        return res.json({
            result: rows[0]
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectcntcategorydata
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectcntcategorydata', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectcntcategorydata  호출됐습니다 : ", accessToken);

    const { userId, selectedDate } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT   ROW_NUMBER() OVER (
                                        ORDER BY DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m') ASC
                                       ,ROUND(SUM(ul.PRICE * er.EXCHANGE_RATE)) DESC
                                      ) AS SEQ
                    ,DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m') AS MONTH
                    ,ul.CATEGORY AS CATEGORY
                    ,ROUND(SUM(ul.PRICE * er.EXCHANGE_RATE)) AS CATEGORY_SUM
                    ,COUNT(*) AS CATEGORY_CNT
              FROM  TB_USER_LOG ul
         LEFT JOIN
                    (
                        SELECT er1.*
                          FROM TB_EXCHANGE_RATE er1
                    INNER JOIN
                             (
                                 SELECT   CURRENCY
                                         ,MAX(CREATE_DT) AS max_dt
                                   FROM TB_EXCHANGE_RATE
                               GROUP BY CURRENCY
                             ) er2
                            ON er1.CURRENCY = er2.CURRENCY
                           AND er1.CREATE_DT = er2.max_dt
                    ) er
                ON   ul.CURRENCY = er.CURRENCY
             WHERE   ul.USER_ID = ?
               AND   DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m') = ?
          GROUP BY   DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m')
                    ,ul.CATEGORY
          ORDER BY   month ASC
                    ,category_sum DESC
        `;

        const [rows] = await db.execute(query, [userId, selectedDate]);

        return res.json({
            result: rows
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectCategoryDetail
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectCategoryDetail', async (req, res) => {

    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(401).json({
            message: "액세스토큰이 없습니다."
        });
    }

    console.log("/rest/main/selectCategoryDetail  호출됐습니다 : ", accessToken);

    const { userId, selectedDate, category } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const query = `
            SELECT  ROW_NUMBER() OVER (
                                        ORDER BY ul.CREATE_DT ASC
                                      ) AS SEQ
                   ,DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m-%d') AS DATE
                   ,ul.SERVICE_NM
                   ,ul.CATEGORY
                   ,ul.PRICE
                   ,CONCAT(er.CUR_NM, '(', er.CURRENCY, ')') AS CURRENCY
            FROM TB_USER_LOG ul
            LEFT JOIN (
                SELECT er1.*
                FROM TB_EXCHANGE_RATE er1
                INNER JOIN (
                    SELECT CURRENCY, MAX(CREATE_DT) AS max_dt
                    FROM TB_EXCHANGE_RATE
                    GROUP BY CURRENCY
                ) er2
                ON er1.CURRENCY = er2.CURRENCY
                AND er1.CREATE_DT = er2.max_dt
            ) er
            ON ul.CURRENCY = er.CURRENCY
            WHERE ul.USER_ID = ?
              AND DATE_FORMAT(DATE(ul.CREATE_DT), '%Y-%m') = ?
              AND ul.CATEGORY = ?
        `;

        const [rows] = await db.execute(query, [
            userId,
            selectedDate,
            category
        ]);

        return res.json({
            result: rows
        });

    } catch (error) {
        return res.status(401).json({
            message: "인증 실패: " + error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectuserdata
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectuserdata', async (req, res) => {
    let accessToken = req.headers['authorization'];
    if (!accessToken) return res.status(401).json({ message: "액세스토큰이 없습니다." });

    console.log("/rest/main/selectuserdata  호출됐습니다 : ", accessToken);

    const { userId } = req.body;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        let query = `select id, email from TB_USERS where id = ?`;
        let params = [userId];

        // SQLite의 await db.all() 대신, MySQL에서는 구조 분해 할당으로 rows만 가져옵니다.
        const [rows] = await db.query(query, params); 

        // 결과 반환 (기존 result 구조 유지)
        res.json({ result: rows });

    } catch (error) {
        res.status(401).json({ message: "인증 실패: " + error.message });
    }
});
















app.listen(PORT, () => {
    console.log(`서버가 실행되었습니다: http://localhost:${PORT}`);
});