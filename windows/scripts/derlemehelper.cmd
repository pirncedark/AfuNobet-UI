@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul
set "PATH=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin;C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja;%PATH%"
set "CMAKE_GENERATOR=Visual Studio 17 2022"
set "CMAKE_TOOLCHAIN_FILE=%~dp0whisper_windows_x64.cmake"
if not defined LIBCLANG_PATH set "LIBCLANG_PATH=%APPDATA%\Python\Python311\site-packages\clang\native"
set "CARGO_NET_OFFLINE=true"
cd /d "%~dp0..\src-tauri"
cargo --offline %*



