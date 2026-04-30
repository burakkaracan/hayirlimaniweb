@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   Hayır Limanı - GitHub'a Gönder
echo ============================================
echo.
echo UYARI: Sunucuyu (npm start) kapatmadan devam etmeyin!
echo Kapatmak icin sunucu penceresinde Ctrl+C yapın.
echo.
set /p confirm="Sunucu kapatıldı mı? (e/h): "
if /i "%confirm%" neq "e" (
  echo İptal edildi.
  pause
  exit /b
)
echo.
echo Dosyalar ekleniyor...
git add data.sqlite uploads/
git status --short
echo.
set /p msg="Commit mesajı (boş bırakılırsa otomatik): "
if "%msg%"=="" set msg=DB ve görseller güncellendi
git commit -m "%msg%"
git push
echo.
echo ✓ Push tamamlandı! Diğer bilgisayarda pull-sync.bat çalıştırın.
echo.
pause
