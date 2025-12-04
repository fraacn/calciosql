@echo off
echo ╔════════════════════════════════════════════════════════╗
echo ║            CALCIO SQL - Avvio Applicazione            ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo 🚀 Avvio container Docker...
echo.

docker-compose up -d

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Applicazione avviata con successo!
    echo.
    echo 📱 Apri il browser su: http://localhost:3000
    echo.
    echo 📊 Per vedere i log: docker-compose logs -f
    echo 🛑 Per fermare: docker-compose down
    echo.
    pause
) else (
    echo.
    echo ❌ Errore durante l'avvio!
    echo.
    echo Verifica che Docker sia installato e avviato.
    echo.
    pause
)
