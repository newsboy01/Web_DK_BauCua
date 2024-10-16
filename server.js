// Hướng dẫn khởi chạy
// node server.js       để chạy server
// pkg --version         để xem version đóng gói exe
// pkg update.js --targets node18-win-x64   đóng gói file update.js thành exe ở dưới client, nhớ chỉnh sửa IP server, localhost cho phù hợp


const express = require('express');
const crypto = require('crypto');
const mssql = require('mssql');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // Import mô-đun fs
const app = express();
const port = 3000;
const mime = require('mime');

// Cấu hình SQL Server
const config = {
  user: 'sa', // Tài khoản SQL Server
  password: 'Sa@123456', // Mật khẩu SQL Server
  server: '36.50.135.6', // Địa chỉ IP của SQL Server
  database: 'account', // Tên database
  options: {
    encrypt: false, // Vô hiệu hóa SSL/TLS
    trustServerCertificate: true, // Bỏ qua chứng chỉ SSL không hợp lệ
    enableArithAbort: true
  }
};

// Kết nối với cơ sở dữ liệu
mssql.connect(config, (err) => {
  if (err) {
    console.error('Lỗi kết nối SQL Server:', err);
  } else {
    console.log('Đã kết nối với SQL Server!');
  }
});

// Middleware để phân tích dữ liệu JSON
app.use(bodyParser.urlencoded({ extended: true })); // Để xử lý dữ liệu từ biểu mẫu
app.use(bodyParser.json()); // Để xử lý dữ liệu JSON nếu cần

// Route mặc định để truy cập vào trang index.html khi vào localhost:3000/
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route để truy cập /index.html cũng vào được trang index
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route hiển thị form đăng ký
app.get('/index.html', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Route để phục vụ trang cập nhật mật khẩu cấp 2
app.get('/update_sec_password.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'update_sec_password.html'));
});


// Route xử lý đăng ký
app.post('/register', async (req, res) => {
  const taikhoan = req.body.tk;
  const password = req.body.mk;

  // Mã hóa mật khẩu bằng MD5 và chuyển thành chữ in hoa
  const matkhau = crypto.createHash('md5').update(password).digest('hex').toUpperCase();

  try {
    const pool = await mssql.connect(config);

    // Kiểm tra tài khoản đã tồn tại
    const checkQuery = `SELECT cAccName FROM Account_Info WHERE cAccName = @taikhoan`;
    const result = await pool.request()
      .input('taikhoan', mssql.VarChar, taikhoan)
      .query(checkQuery);

    if (result.recordset.length > 0) {
      // Tài khoản đã tồn tại
      return res.send("Tài khoản đã tồn tại, vui lòng chọn tài khoản khác.");
    } else {
      // Thêm tài khoản mới vào bảng Account_Info
      const insertAccountInfoQuery = `
        INSERT INTO Account_Info (cAccName, cPassWord)
        VALUES (@taikhoan, @matkhau);
      `;
      await pool.request()
        .input('taikhoan', mssql.VarChar, taikhoan)
        .input('matkhau', mssql.VarChar, matkhau)
        .query(insertAccountInfoQuery);

      // Thêm dữ liệu vào bảng Account_Habitus với các giá trị cố định
      const insertAccountHabitusQuery = `
        INSERT INTO Account_Habitus (cAccName, iFlag, iLeftSecond, nExtPoint, iLeftMonth, dEndDate)
        VALUES (@taikhoan, 0, 999, 0, 999, '2035-10-10T10:10:10');
      `;
      await pool.request()
        .input('taikhoan', mssql.VarChar, taikhoan)
        .query(insertAccountHabitusQuery);

      return res.send("Đăng ký tài khoản thành công!");
    }
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    return res.status(500).send("Có lỗi xảy ra, vui lòng thử lại.");
  }
});


// Middleware để phân tích dữ liệu JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware để phục vụ tệp tĩnh
app.use(express.static('public')); // Giả sử tệp HTML nằm trong thư mục 'public'
// Route để phục vụ napxu.html
app.get('/napxu.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'napxu.html'));
});

// Nạp xu
app.post('/napxu', async (req, res) => {
    const { tk1: taikhoannap, soxu, mk2: pass } = req.body;
  
    if (!taikhoannap) {
      return res.json({ success: false, message: "Vui lòng nhập tài khoản." });
    }
    if (!soxu) {
        return res.json({ success: false, message: "Vui lòng nhập số xu." });
    }
    if (!pass) {
        return res.json({ success: false, message: "Vui lòng nhập mật khẩu." });
    }
  
    if (pass !== "napxu11") {
      return res.json({ success: false, message: "Mật khẩu sai." });
    }
  
    try {
      const pool = await mssql.connect(config);
  
      // Kiểm tra tài khoản có tồn tại không
      const checkQuery = `SELECT * FROM Account_Habitus WHERE cAccName = @taikhoannap`;
      const result = await pool.request()
        .input('taikhoannap', mssql.VarChar, taikhoannap)
        .query(checkQuery);
  
      if (result.recordset.length === 0) {
        return res.json({ success: false, message: "Tài khoản không tồn tại." });
      }
  
      const member = result.recordset[0];
      const oldExtPoint = member.nExtPoint;
      const newExtPoint = oldExtPoint + parseInt(soxu);
  
      // Cập nhật số xu
      const updateQuery = `
        UPDATE Account_Habitus
        SET nExtPoint = nExtPoint + @soxu
        WHERE cAccName = @taikhoannap
      `;
      await pool.request()
        .input('soxu', mssql.Int, soxu)
        .input('taikhoannap', mssql.VarChar, taikhoannap)
        .query(updateQuery);
  
      // Thêm lịch sử nạp xu
      const insertHistoryQuery = `
        INSERT INTO AddExtPoint_History (cAccName, addExtPoint, oldExtPoint, newExtPoint)
        VALUES (@taikhoannap, @soxu, @oldExtPoint, @newExtPoint)
      `;
      await pool.request()
        .input('taikhoannap', mssql.VarChar, taikhoannap)
        .input('soxu', mssql.Int, soxu)
        .input('oldExtPoint', mssql.Int, oldExtPoint)
        .input('newExtPoint', mssql.Int, newExtPoint)
        .query(insertHistoryQuery);
  
      res.json({ success: true });
    } catch (err) {
      console.error('Lỗi nạp xu:', err);
      res.status(500).json({ success: false, message: "Có lỗi xảy ra, vui lòng thử lại." });
    }
  });
  
// Lấy top 10 lịch sử nạp xu
app.get('/history', async (req, res) => {
try {
    const pool = await mssql.connect(config);

    const historyQuery = `
    SELECT TOP 10 cAccName, addExtPoint, oldExtPoint, newExtPoint, nDateTime
    FROM AddExtPoint_History
    ORDER BY nDateTime DESC
    `;
    const result = await pool.request().query(historyQuery);

    res.json(result.recordset);
} catch (err) {
    console.error('Lỗi lấy lịch sử:', err);
    res.status(500).json({ message: "Có lỗi xảy ra." });
}
});

// Route để lấy danh sách toàn bộ các file và thư mục con trong thư mục updategame
app.get('/filelist', (req, res) => {
  const directoryPath = path.join(__dirname, 'updategame');

  function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(file => {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      } else {
        //arrayOfFiles.push(path.join(dirPath, file).replace(__dirname, ''));
        arrayOfFiles.push(path.join(dirPath, file).replace(__dirname, '').replace(/\\/g, '/'));
      }
    });

    return arrayOfFiles;
  }

  const fileList = getAllFiles(directoryPath);
  res.json(fileList);
});

// Serve files from the updategame folder
app.get('/updategame/*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Route để phục vụ update_expiration.html
app.get('/update_expiration.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'update_expiration.html'));
});

// Route xử lý cập nhật thời hạn tài khoản
app.post('/update-expiration', async (req, res) => {
  const { tk: taikhoan, dEndDate } = req.body;

  if (!taikhoan || !dEndDate) {
      return res.json({ success: false, message: "Vui lòng nhập đầy đủ thông tin." });
  }

  try {
      const pool = await mssql.connect(config);

      // Kiểm tra tài khoản có tồn tại không
      const checkQuery = `SELECT * FROM Account_Habitus WHERE cAccName = @taikhoan`;
      const result = await pool.request()
          .input('taikhoan', mssql.VarChar, taikhoan)
          .query(checkQuery);

      if (result.recordset.length === 0) {
          return res.json({ success: false, message: "Tài khoản không tồn tại." });
      }

      // Cập nhật thời hạn mới
      const updateQuery = `UPDATE Account_Habitus SET dEndDate = @dEndDate WHERE cAccName = @taikhoan`;
      await pool.request()
          .input('dEndDate', mssql.VarChar, dEndDate + 'T23:59:59') // Đặt thời gian đến cuối ngày
          .input('taikhoan', mssql.VarChar, taikhoan)
          .query(updateQuery);

      res.json({ success: true, message: "Cập nhật thời hạn tài khoản thành công!" });
  } catch (err) {
      console.error('Lỗi cập nhật thời hạn tài khoản:', err);
      res.status(500).json({ success: false, message: "Có lỗi xảy ra, vui lòng thử lại." });
  }
});

// Route xử lý cập nhật mật khẩu cấp 2
app.post('/update_sec_password', async (req, res) => {
  const taikhoan = req.body.tk;
  const secPassword = req.body.secPassword;

  // Mã hóa mật khẩu cấp 2 bằng MD5 và chuyển thành chữ in hoa
  const matkhauSec = crypto.createHash('md5').update(secPassword).digest('hex').toUpperCase();

  try {
    const pool = await mssql.connect(config);

    // Kiểm tra tài khoản có tồn tại không
    const checkQuery = `SELECT cAccName FROM Account_Info WHERE cAccName = @taikhoan`;
    const result = await pool.request()
      .input('taikhoan', mssql.VarChar, taikhoan)
      .query(checkQuery);

    if (result.recordset.length === 0) {
      // Tài khoản không tồn tại
      return res.send("Tài khoản không tồn tại.");
    } else {
      // Cập nhật mật khẩu cấp 2
      const updateSecPasswordQuery = `
        UPDATE Account_Info
        SET cSecPassword = @matkhauSec
        WHERE cAccName = @taikhoan;
      `;
      await pool.request()
        .input('matkhauSec', mssql.VarChar, matkhauSec)
        .input('taikhoan', mssql.VarChar, taikhoan)
        .query(updateSecPasswordQuery);

      return res.send("Cập nhật mật khẩu cấp 2 thành công!");
    }
  } catch (err) {
    console.error('Lỗi cập nhật mật khẩu cấp 2:', err);
    return res.status(500).send("Có lỗi xảy ra, vui lòng thử lại.");
  }
});


// Khởi động server
app.listen(port, () => {
    console.log(`Server đang chạy trên cổng ${port}`);
  });