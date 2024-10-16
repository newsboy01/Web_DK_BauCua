# Thiết lập mã hóa đầu ra nếu cần
[Console]::OutputEncoding = [Text.Encoding]::UTF8

# URL của server để lấy danh sách file và tải file
$serverUrl = "http://103.20.103.182:3000"

# Thư mục gốc nơi sẽ lưu các file tải về
$targetDir = (Get-Location).Path

# Kiểm tra sự tồn tại của file game.exe
$gameExePath = Join-Path $targetDir "game.exe"
if (-not (Test-Path $gameExePath)) {
    Write-Host "Không tìm thấy file game.exe trong thư mục cần thiết! Hãy thoát ra và copy lại." -ForegroundColor Red
    exit 1  # Thoát khỏi script nếu không tìm thấy file
}

# Kiểm tra phiên bản PowerShell
$psVersion = $PSVersionTable.PSVersion.Major

# Lấy danh sách file từ server theo phiên bản PowerShell
if ($psVersion -ge 3) {
    # PowerShell 3.0 trở lên
    $response = Invoke-RestMethod -Uri "$serverUrl/filelist"
    $files = $response
} else {
    # PowerShell dưới 3.0 (Windows 7)
    $response = Invoke-WebRequest -Uri "$serverUrl/filelist"
    $files = $response.Content -split "`n"  # Phân tích từ văn bản
}

# Tạo thư mục nếu chưa tồn tại
function Create-DirIfNotExist {
    param([string]$dir)
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir
    }
}

# Tải file từ server
function Download-File {
    param([string]$file)
    
    # Thay thế dấu / bằng \ để lấy đường dẫn chính xác
    $relativePath = $file -replace "^/updategame", ""

    # Tạo URL chính xác cho file
    $fileUrl = "$serverUrl$file" -replace "\\", "/"

    # Đường dẫn file lưu trên máy
    $targetFilePath = Join-Path $targetDir $relativePath

    # Tạo thư mục nếu cần
    $fileDir = Split-Path $targetFilePath
    Create-DirIfNotExist -dir $fileDir

    # Tải file về và ghi đè nếu cần
    try {
        Invoke-WebRequest -Uri $fileUrl -OutFile $targetFilePath -ErrorAction Stop
        Write-Host "Tải thành công: $relativePath" -ForegroundColor Green
        return $true  # Trả về true nếu tải thành công
    } catch {
        Write-Host "Tải lỗi: $relativePath. Chi tiết: $_" -ForegroundColor Red
        return $false  # Trả về false nếu tải không thành công
    }
}

# Biến để theo dõi tình trạng tải xuống
$allSuccess = $true

# Tải toàn bộ file từ danh sách server
foreach ($file in $files) {
    $result = Download-File -file $file
    if (-not $result) {
        $allSuccess = $false  # Nếu có lỗi, đánh dấu là không thành công
    }
}

# Kiểm tra và thông báo kết quả cuối cùng
if ($allSuccess) {
    Write-Host "AutoUpdate Thành công!!" -ForegroundColor Green
} else {
    Write-Host "Có lỗi trong quá trình tải!" -ForegroundColor Red
}
