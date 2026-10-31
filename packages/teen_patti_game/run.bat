@echo off
title Teen Patti Game
cd /d "%~dp0"
echo Compiling Teen Patti Game...
javac -d out/production/Game src/Base/*.java src/TeenPatti/*.java
echo Starting Game...
echo.
java -cp out/production/Game TeenPatti.Main
echo.
pause
