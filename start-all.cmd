@echo off
setlocal

rem Danh sách service dùng npm run dev
set services=backend-gateway user-service post-service message-service notification-service

rem Chạy các service
for %%f in (%services%) do (
    echo Starting %%f ...
    start cmd /k "cd %%f && npm run dev"
)

rem Chạy client
echo  Starting client ...
start cmd /k "cd client && npm start"

echo  All services and client are starting...
