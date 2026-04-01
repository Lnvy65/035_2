const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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

let db, db2;
(async () => {
    db = await open({ filename: './database.db', driver: sqlite3.Database });
    db2 = await open({ filename: '../035-batch/database.db', driver: sqlite3.Database });
    db3 = await open({ filename: './035_database.db', driver: sqlite3.Database });
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
// /rest/user/updateprofile
// -----------------------------------------------------------------------------------------------------------
app.post(
  '/rest/user/updateprofile',
  upload.single("imgMyProfile"), // ✅ 파일 업로드 미들웨어
  async (req, res) => {

    // 1. Header에서 토큰 가져오기
    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "액세스토큰이 헤더에 없습니다." });
    }

    console.log("/rest/user/updateprofile 호출:", accessToken);

    // form-data 텍스트 필드
    const { user, password, buyingAmt, address } = req.body;

    // 업로드된 파일
    const imgMyProfile = req.file;

    if (!user) {
        return res.status(400).json({ message: "아이디를 입력해주세요." });
    }

    try {
        // 토큰 검증
        jwt.verify(accessToken, SECRET_KEY);

        /* =========================
           환율 설정
        ========================== */
        const user_my = await db2.get(
            'SELECT * FROM tb_my_cur_exr WHERE username = ? and currency = ?',
            [user, 'USD']
        );

        let result;

        if (user_my) {
            result = await db2.run(
                'UPDATE tb_my_cur_exr SET exchange_rate = ? WHERE username = ? and currency = ?',
                [buyingAmt, user, 'USD']
            );
        } else {
            result = await db2.run(
                'INSERT INTO tb_my_cur_exr (username, currency, exchange_rate) VALUES (?, ?, ?)',
                [user, 'USD', buyingAmt]
            );
        }

        /* =========================
           비밀번호
        ========================== */
        if (password) {
            await db.run(
                'UPDATE users SET password = ? WHERE username = ?',
                [password, user]
            );
        }

        /* =========================
           주소
        ========================== */
        if (address) {
            await db.run(
                'UPDATE users SET address = ? WHERE username = ?',
                [address, user]
            );
        }

        /* =========================
           프로필 이미지
        ========================== */
        if (imgMyProfile) {
            await db.run(
                'UPDATE users SET img_name = ? WHERE username = ?',
                [imgMyProfile.filename, user]
            );
        }

        res.json({
            user,
            address,
            my_exchange_rate: buyingAmt,
            imgMyProfile: imgMyProfile?.filename,
            message: "개인설정저장 성공!"
        });

    } catch (error) {
        res.status(401).json({
            stt: -1,
            message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/auth/login
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/auth/login', async (req, res) => {
    
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "아이디와 비밀번호를 입력해주세요." });
    }

    console.log("/rest/auth/login 호출됐습니다 : ", username);

    try {
        // DB에서 유저 조회
        const user = await db.get(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        );

        // 1. 유저가 아예 없는 경우 (아이디/비번 틀림)
        if (!user) {
            return res.status(401).json({ message: "아이디 또는 비밀번호가 일치하지 않습니다." });
        }

        if(user.use_yn === "N"){
            res.status(403).json({ message: "인증되지 않은 계정입니다. 관리자에게 연락하세요." });
        }

        const exr = await db2.get(
            'select exchange_rate AS my_exchange_rate from tb_my_cur_exr where username = ?',
            [username]
        );

        if (user) {
            // 1. JWT 생성 (유효기간 2시간)
            const accessToken = jwt.sign(
                { id: user.id, username: user.username, kname: user.kname, roles: user.roles, address: user.address, my_exchange_rate: exr.my_exchange_rate },   // payload에 필요한 정보만 전달
                SECRET_KEY,
                { expiresIn: '2h' }
            );

            // 1. JWT 생성 (유효기간 24시간)
            const refreshToken = jwt.sign(
                { id: user.id, username: user.username, kname: user.kname, roles: user.roles, address: user.address, my_exchange_rate: exr.my_exchange_rate },   // payload에 필요한 정보만 전달
                SECRET_KEY,
                { expiresIn: '24h' }
            );            


            // 2. httpOnly 쿠키에 토큰 설정
            // secure: true는 HTTPS 환경에서만 작동하므로 로컬 테스트 시에는 주석 처리하거나 false로 둡니다.
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true, // 클라이언트 자바스크립트에서 접근 불가 (보안)
                maxAge: 24 * 60 * 60 * 1000, // 24시간 (밀리초 단위)
                // secure: process.env.NODE_ENV === 'production',
                // 만약 프론트와 백엔드의 도메인이 완전히 다르다면 (예: a.com / b.com)
                // sameSite: 'none', secure: true 설정이 필요합니다. (HTTPS 필수)                
                sameSite: 'lax'
            });            

            res.json(
                {
                    accessToken : accessToken,
                    user: { id: user.id, username: user.username, kname: user.kname, roles: user.roles, address: user.address, my_exchange_rate: exr.my_exchange_rate },
                    message: "로그인 성공!"
                }
            );
        } else {
            res.status(401).json({ message: "아이디 또는 비밀번호가 일치하지 않습니다." });
        }
    } catch (error) {
        res.status(401).json({ 
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
        return res.status(401).json({ message: "리프레시 토큰이 없습니다. 다시 로그인해주세요." });
    }

    console.log("/rest/auth/refresh 호출됐습니다 : ", refreshToken);

    try {
        // 리프레시 토큰 검증
        const decoded = jwt.verify(refreshToken, SECRET_KEY);   // 토큰이 유효하지 않으면 에러 발생, return문은 payuload 반환

        // user 조회
        const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);

        const exr = await db2.get(
            'select exchange_rate AS my_exchange_rate from tb_my_cur_exr where username = ?',
            [decoded.username]
        );        

        if (user) {
            // 1. JWT 생성 (유효기간 2시간)
            const accessToken = jwt.sign(
                { id: user.id, username: user.username, kname: user.kname, roles: user.roles, address: user.address, my_exchange_rate: exr.my_exchange_rate },
                SECRET_KEY,
                { expiresIn: '2h' }
            );

            res.json(
                {
                    accessToken : accessToken,
                    user: { id: user.id, username: user.username, kname: user.kname, roles: user.roles, address: user.address, my_exchange_rate: exr.my_exchange_rate },
                    message: "리플레쉬 성공!"
                }
            );
        } else {
            res.status(401).json({ message: "아이디 또는 비밀번호가 일치하지 않습니다." });
        }
    } catch (error) {
        res.status(401).json({ 
                stt: -1,
                message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/oneuser
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/oneuser', async (req, res) => {

    // 1. Header에서 토큰 가져오기 (보통 'authorization' 필드를 사용합니다)
    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "액세스토큰이 헤더에 없습니다." });
    }

    console.log("/rest/user/oneuser 호출됐습니다 : ", accessToken);

    // id값 가져오기
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ message: "아이디를 입력해주세요." });
    }

    try {
        // 엑세스 토큰 검증
        const decoded = jwt.verify(accessToken, SECRET_KEY);   // 토큰이 유효하지 않으면 에러 발생, return문은 payuload 반환

        // DB에서 유저 조회
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        res.json(
            {
                user: user,
                message: "사용자조회 성공!"
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
// /rest/user/alluser
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/alluser', async (req, res) => {

    // 1. Header에서 토큰 가져오기 (보통 'authorization' 필드를 사용합니다)
    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "액세스토큰이 헤더에 없습니다." });
    }

    console.log("/rest/user/alluser 호출됐습니다 : ", accessToken);

    // keyword값 가져오기
    const { keyword } = req.body;

    try {
        // 엑세스 토큰 검증
        const decoded = jwt.verify(accessToken, SECRET_KEY);

        let query = 'SELECT * FROM users';
        let params = [];

        // 1. keyword가 존재할 경우 WHERE 조건 동적 생성
        if (keyword && keyword.trim() !== "") {
            // 아이디(username) 또는 이름(kname)에 키워드가 포함된 경우 검색
            query += ' WHERE username LIKE ? OR kname LIKE ? OR roles LIKE ? OR email LIKE ? OR address LIKE ?';
            const searchKeyword = `%${keyword}%`; // 부분 일치 검색을 위해 % 추가
            params.push(searchKeyword, searchKeyword, searchKeyword, searchKeyword, searchKeyword);
        }

        // 2. 정렬 조건 추가
        query += ' ORDER BY id DESC';

        // 3. DB 조회 (params를 두 번째 인자로 전달)
        const users = await db.all(query, params);

        res.json({
            user: users,
            message: keyword ? `"${keyword}" 검색 결과 조회 성공!` : "모든 사용자조회 성공!"
        });

    } catch (error) {
        res.status(401).json({ 
                stt: -1,
                message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/modify
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/modifyuser', async (req, res) => {

    // 1. Header에서 토큰 가져오기 (보통 'authorization' 필드를 사용합니다)
    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "액세스토큰이 헤더에 없습니다." });
    }

    console.log("/rest/user/modifyuser 호출됐습니다 : ", accessToken);

    // id값 가져오기
    const { id, username, kname, roles, email, address, use_yn } = req.body;
    if (!id) {
        return res.status(400).json({ message: "아이디를 입력해주세요." });
    }

    try {
        // 엑세스 토큰 검증
        const decoded = jwt.verify(accessToken, SECRET_KEY);   // 토큰이 유효하지 않으면 에러 발생, return문은 payuload 반환

        // 1. DB 데이터 수정 실행
        const result = await db.run(
            'UPDATE users SET username = ?, kname = ?, roles = ?, email = ?, address = ?, use_yn = ?  WHERE id = ?',
            [username, kname, roles, email, address, use_yn, id]
        );

        // 2. 결과 응답
        if (result.changes > 0) {
            res.json({
                updatedId: id,
                message: "사용자 정보 수정 성공!",
            });
        } else {
            res.status(404).json({
                message: "수정할 사용자를 찾지 못했습니다."
            });
        }

    } catch (error) {
        res.status(401).json({ 
                stt: -1,
                message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/deleteuser
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/user/deleteuser', async (req, res) => {

    // 1. Header에서 토큰 가져오기 (보통 'authorization' 필드를 사용합니다)
    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "액세스토큰이 헤더에 없습니다." });
    }

    console.log("/rest/user/deleteuser 호출됐습니다 : ", accessToken);

    // id값 가져오기
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ message: "Id를 입력해주세요." });
    }

    try {
        // 엑세스 토큰 검증
        const decoded = jwt.verify(accessToken, SECRET_KEY);   // 토큰이 유효하지 않으면 에러 발생, return문은 payuload 반환

        // 1. DB 데이터 수정 실행
        const result = await db.run(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        // 2. 결과 응답
        if (result.changes > 0) {
            res.json({
                deletedId: id,
                message: "사용자 정보 삭제 성공!",
            });
        } else {
            res.status(404).json({
                message: "수정할 사용자를 찾지 못했습니다."
            });
        }

    } catch (error) {
        res.status(401).json({ 
                stt: -1,
                message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/user/add
// -----------------------------------------------------------------------------------------------------------
app.post('/user/adduser', async (req, res) => {

    // 1. Header에서 토큰 가져오기 (보통 'authorization' 필드를 사용합니다)
    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "액세스토큰이 헤더에 없습니다." });
    }

    console.log("/rest/user/adduser 호출됐습니다 : ", accessToken);

    // id값 가져오기
    const { id, username, password, kname, roles, email, address, use_yn } = req.body;
    if (!username) {
        return res.status(400).json({ message: "아이디를 입력해주세요." });
    }

    try {
        // 엑세스 토큰 검증
        const decoded = jwt.verify(accessToken, SECRET_KEY);   // 토큰이 유효하지 않으면 에러 발생, return문은 payuload 반환

        // 1. DB 데이터 수정 실행
        const result = await db.run(
            'INSERT INTO users (username, password, kname, roles, email, address, use_yn) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, password, kname, roles, email, address, use_yn]
        );

        // 2. 결과 응답
        if (result.changes > 0) {
            res.json({
                updatedId: id,
                message: "사용자 정보 생성 성공!",
            });
        } else {
            res.status(404).json({
                message: "사용자생성에 실패했습니다."
            });
        }

    } catch (error) {
        res.status(401).json({ 
                stt: -1,
                message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/exr/updatemyexr
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/exr/updatemyexr', async (req, res) => {

    // 1. Header에서 토큰 가져오기 (보통 'authorization' 필드를 사용합니다)
    const accessToken = req.headers['authorization'];
    if (!accessToken) {
        return res.status(400).json({ message: "액세스토큰이 헤더에 없습니다." });
    }

    console.log("/rest/exr/updatemyexr 호출됐습니다 : ", accessToken);

    // user값 가져오기
    const { user, buyingAmt } = req.body;
    if (!user) {
        return res.status(400).json({ message: "아이디를 입력해주세요." });
    }

    try {
        // 엑세스 토큰 검증
        const decoded = jwt.verify(accessToken, SECRET_KEY);   // 토큰이 유효하지 않으면 에러 발생, return문은 payuload 반환

        // DB에서 유저 조회
        const user_my = await db2.get('SELECT * FROM tb_my_cur_exr WHERE username = ? and currency = ?', [user, 'USD']);
        let result = "";

        if(user_my){
            result = await db2.run(
                'UPDATE tb_my_cur_exr SET exchange_rate = ?  WHERE username = ? and currency = ? ',
                [buyingAmt, user, 'USD']
            );
        }else{
            result = await db2.run(
                'INSERT INTO tb_my_cur_exr (username, currency, exchange_rate) VALUES ( ?, ?, ? )',
                [user, 'USD', buyingAmt]
            );
        }

        // 2. 결과 응답
        if (result.changes > 0) {
            res.json({
                user: user,
                message: "개인환율설정 성공!",
            });
        } else {
            res.status(404).json({
                message: "수정할 사용자를 찾지 못했습니다."
            });
        }

    } catch (error) {
        res.status(401).json({ 
                stt: -1,
                message: error.message
        });
    }
});


// -----------------------------------------------------------------------------------------------------------
//rest/signup/signup
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/signup/signup', async (req, res) => {
    //let accessToken = req.headers['authorization'];

    const { username, password, kname, email } = req.body;

    try {
        //jwt.verify(accessToken, SECRET_KEY);

        // 기존 파일 정보 조회 후 삭제
        const row = await db.get('select count(*) FROM users where username = ?', [username]);
        if(row['count(*)'] > 0){
            return res.status(400).json({ message: "아이디 중복" });
        }
        const result = await db.run('INSERT INTO users (username, password, kname, roles, email, img_name, address, use_yn) VALUES (?, ?, ?, "USER", ?, null, null, "N")',
        [username, password, kname, email]);

        const exr = await db2.run(
            'insert into tb_my_cur_exr (username, currency, exchange_rate) values(?, "USD", 1500)',
            [username]
        );

        const subHub = await db3.run(
            'insert into users (ID, PASSWORD, USER_NM, EMAIL, ROLES) values(?, ?, ?, ?, "USER")',
            [username, password, kname, email]
        );

        if (result.changes > 0 && exr.changes > 0 && subHub.changes > 0) res.json({ message: "계정 생성 성공!" });
        else res.status(500).json({ message: "계정 생성 실패" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "인증 실패" });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectnotice
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectsum', async (req, res) => {
    let accessToken = req.headers['authorization'];
    if (!accessToken) return res.status(401).json({ message: "액세스토큰이 없습니다." });

    const { userName } = req.body; 

    try {
        jwt.verify(accessToken, SECRET_KEY);

        // 1. LEFT JOIN의 ON 절에 userName 조건을 넣어야 합니다. 
        // 그래야 '리뷰가 없는 공지'도 결과에 포함됩니다.
        let query = `select sum(MONTHLY_PRICE) as sum, count(*) as count from USER_SUB where USER_NM = ? and USE_YN = 'Y'`;
        
        // userName은 JOIN 조건으로 들어가므로 가장 먼저 push
        let params = [userName];

        const result = await db3.all(query, params);

        res.json({ result: result });

    } catch (error) {
        res.status(401).json({ message: "인증 실패: " + error.message });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectdate    같은날 서비스가 여러개라면? 어떻게 처리할건지
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectdate', async (req, res) => {
    let accessToken = req.headers['authorization'];
    if (!accessToken) return res.status(401).json({ message: "액세스토큰이 없습니다." });

    const { userName } = req.body; 

    try {
        jwt.verify(accessToken, SECRET_KEY);

        // 1. LEFT JOIN의 ON 절에 userName 조건을 넣어야 합니다. 
        // 그래야 '리뷰가 없는 공지'도 결과에 포함됩니다.
        let query = `SELECT  NEXT_BILLING_DT
                            ,SERVICE_NM 
                       FROM USER_SUB
                      WHERE NEXT_BILLING_DT >= date('now', 'localtime')
                        AND use_yn = 'Y'
                        AND USER_NM = ?
                   ORDER BY NEXT_BILLING_DT ASC
                      LIMIT 1`;
        
        // userName은 JOIN 조건으로 들어가므로 가장 먼저 push
        let params = [userName];

        const result = await db3.all(query, params);

        res.json({ result: result });

    } catch (error) {
        res.status(401).json({ message: "인증 실패: " + error.message });
    }
});



// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectsublist
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectsublist', async (req, res) => {
    let accessToken = req.headers['authorization'];
    if (!accessToken) return res.status(401).json({ message: "액세스토큰이 없습니다." });

    const { userName } = req.body; 

    try {
        jwt.verify(accessToken, SECRET_KEY);

        // 1. LEFT JOIN의 ON 절에 userName 조건을 넣어야 합니다. 
        // 그래야 '리뷰가 없는 공지'도 결과에 포함됩니다.
        let query = `select  SEQ
                            ,SERVICE_NM
                            ,MONTHLY_PRICE
                            ,NEXT_BILLING_DT
                            ,ANCHOR_DAY
                            ,BILLING_CYCLE
                            ,CATEGORY
                            ,USE_YN
                            ,CREATE_DT
                            ,UPDATE_DT
                       from USER_SUB
                      where USER_NM = ?
                   ORDER BY SEQ DESC`;
        
        // userName은 JOIN 조건으로 들어가므로 가장 먼저 push
        let params = [userName];

        const result = await db3.all(query, params);

        res.json({ result: result });

    } catch (error) {
        res.status(401).json({ message: "인증 실패: " + error.message });
    }
});


// -----------------------------------------------------------------------------------------------------------
// /rest/main/selectsubchart
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/selectsubchart', async (req, res) => {
    let accessToken = req.headers['authorization'];
    if (!accessToken) return res.status(401).json({ message: "액세스토큰이 없습니다." });

    const { userName } = req.body; 

    try {
        jwt.verify(accessToken, SECRET_KEY);

        // 1. LEFT JOIN의 ON 절에 userName 조건을 넣어야 합니다. 
        // 그래야 '리뷰가 없는 공지'도 결과에 포함됩니다.
        let query = `SELECT      CATEGORY
                                ,SUM(MONTHLY_PRICE) AS TOTAL_PRICE
                       FROM     USER_SUB
                      WHERE     USER_NM = ?
                   GROUP BY     CATEGORY
                   ORDER BY     TOTAL_PRICE DESC`;
        
        // userName은 JOIN 조건으로 들어가므로 가장 먼저 push
        let params = [userName];

        const result = await db3.all(query, params);

        res.json({ result: result });

    } catch (error) {
        res.status(401).json({ message: "인증 실패: " + error.message });
    }
});


// -----------------------------------------------------------------------------------------------------------
//rest/main/deletesub
// -----------------------------------------------------------------------------------------------------------
app.post('/rest/main/deletesub', async (req, res) => {
    let accessToken = req.headers['authorization'];

    const seq = req.body.seq || req.body.SEQ;

    try {
        jwt.verify(accessToken, SECRET_KEY);

        const subResult = await db3.run('DELETE FROM USER_SUB WHERE seq = ?', [seq]);

        if (subResult.changes > 0) res.json({ message: "삭제 성공!" });
        else res.status(404).json({ message: "대상 없음" });
    } catch (error) {
        res.status(401).json({ message: "인증 실패" });
    }
});












app.listen(PORT, () => {
    console.log(`서버가 실행되었습니다: http://localhost:${PORT}`);
});