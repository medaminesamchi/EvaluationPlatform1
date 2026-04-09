@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script, version 3.3.2
@REM
@REM Required ENV vars:
@REM   JAVA_HOME - location of a JDK home dir
@REM
@REM Optional ENV vars:
@REM   MAVEN_BATCH_ECHO - set to 'on' to enable the echoing of the batch commands
@REM   MAVEN_BATCH_PAUSE - set to 'on' to wait for a keystroke before ending
@REM   MAVEN_OPTS - parameters passed to the Java VM when running Maven
@REM     e.g. to debug Maven itself, use
@REM       set MAVEN_OPTS=-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=8000
@REM   MAVEN_SKIP_RC - flag to disable loading of mavenrc files
@REM ----------------------------------------------------------------------------

@REM Begin all REM://Options
@REM Set title of command window
@TITLE %~dp0
@REM Enable echoing by setting MAVEN_BATCH_ECHO to 'on'
@IF "%MAVEN_BATCH_ECHO%"=="on" @ECHO ON

@REM set %HOME% to equivalent of $HOME
IF "%HOME%"=="" (SET "HOME=%HOMEDRIVE%%HOMEPATH%")

@REM Execute a user defined script before this one
IF NOT "%MAVEN_SKIP_RC%"=="" GOTO skipRcPre
@REM check for pre script, once with legacy .bat ending and once with .cmd ending
IF EXIST "%USERPROFILE%\mavenrc_pre.bat" CALL "%USERPROFILE%\mavenrc_pre.bat" %*
IF EXIST "%USERPROFILE%\mavenrc_pre.cmd" CALL "%USERPROFILE%\mavenrc_pre.cmd" %*
:skipRcPre

@SETLOCAL

SET ERROR_CODE=0

@REM To isolate internal variables from possible post scripts, we use another setlocal
@SETLOCAL

IF NOT "%JAVA_HOME%"=="" GOTO findJavaFromJavaHome

FOR %%I IN (java.exe) DO SET "JAVACMD=%%~$PATH:I"

IF NOT "%JAVACMD%"=="" GOTO init
ECHO.
ECHO Error: JAVA_HOME is not defined and no 'java' command could be found in your PATH.
ECHO.
ECHO Please set the JAVA_HOME variable in your environment to match the
ECHO location of your Java installation.
ECHO.
GOTO error

:findJavaFromJavaHome
SET JAVA_HOME=%JAVA_HOME:"=%
SET JAVACMD=%JAVA_HOME%\bin\java.exe

IF EXIST "%JAVACMD%" GOTO init

ECHO.
ECHO Error: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
ECHO.
ECHO Please set the JAVA_HOME variable in your environment to match the
ECHO location of your Java installation.
ECHO.
GOTO error

:init
@REM Find the project base dir, i.e. the directory that contains the folder ".mvn".
@REM Fallback to current working directory if not found.

SET MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
IF NOT "%MAVEN_PROJECTBASEDIR%"=="" GOTO endDetectBaseDir

SET EXEC_DIR=%CD%
SET WDIR=%EXEC_DIR%
:findBaseDir
IF EXIST "%WDIR%"\.mvn GOTO baseDirFound
cd ..
IF "%WDIR%"=="%CD%" GOTO baseDirNotFound
SET WDIR=%CD%
GOTO findBaseDir

:baseDirFound
SET MAVEN_PROJECTBASEDIR=%WDIR%
cd "%EXEC_DIR%"
GOTO endDetectBaseDir

:baseDirNotFound
SET MAVEN_PROJECTBASEDIR=%EXEC_DIR%
cd "%EXEC_DIR%"

:endDetectBaseDir

IF NOT EXIST "%MAVEN_PROJECTBASEDIR%\.mvn\jvm.config" GOTO endReadAdditionalConfig

@setlocal EnableExtensions EnableDelayedExpansion
for /F "usebackq delims=" %%a in ("%MAVEN_PROJECTBASEDIR%\.mvn\jvm.config") do set JVM_CONFIG_MAVEN_PROPS=!JVM_CONFIG_MAVEN_PROPS! %%a
@endlocal & set JVM_CONFIG_MAVEN_PROPS=%JVM_CONFIG_MAVEN_PROPS%

:endReadAdditionalConfig

SET MAVEN_JAVA_EXE="%JAVACMD%"
set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

set WRAPPER_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar"

FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties") DO (
    IF "%%A"=="wrapperUrl" SET WRAPPER_URL=%%B
)

@REM Extension to allow automatically downloading the maven-wrapper.jar from Maven-central
@REM This allows using the maven wrapper in projects that prohibit checking in binary data.
IF EXIST %WRAPPER_JAR% (
    IF "%MVNW_VERBOSE%"=="true" (
        ECHO Found %WRAPPER_JAR%
    )
) ELSE (
    IF NOT "%MVNW_REPOURL%"=="" (
        SET WRAPPER_URL="%MVNW_REPOURL%/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar"
    )
    IF "%MVNW_VERBOSE%"=="true" (
        ECHO Couldn't find %WRAPPER_JAR%, downloading it ...
        ECHO Downloading from: %WRAPPER_URL%
    )

    powershell -Command "&{"^
        "$webclient = new-object System.Net.WebClient;"^
        "if (-not ([string]::IsNullOrEmpty('%MVNW_USERNAME%') -and [string]::IsNullOrEmpty('%MVNW_PASSWORD%'))) {"^
        "$webclient.Credentials = new-object System.Net.NetworkCredential('%MVNW_USERNAME%', '%MVNW_PASSWORD%');"^
        "}"^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $webclient.DownloadFile('%WRAPPER_URL%', '%WRAPPER_JAR%')"^
        "}"
    IF "%MVNW_VERBOSE%"=="true" (
        ECHO Finished downloading %WRAPPER_JAR%
    )
)
@REM End of extension

@REM If specified, validate the SHA-256 sum of the Maven wrapper jar file
SET WRAPPER_SHA_256_SUM=""
FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties") DO (
    IF "%%A"=="wrapperSha256Sum" SET WRAPPER_SHA_256_SUM=%%B
)
IF NOT %WRAPPER_SHA_256_SUM%=="" (
    powershell -Command "&{"^
       "Import-Module $PSHOME\Modules\Microsoft.PowerShell.Utility -Function Get-FileHash;"^
       "$hash = (Get-FileHash \"%WRAPPER_JAR%\" -Algorithm SHA256).Hash.ToLower();"^
       "If('%WRAPPER_SHA_256_SUM%' -ne $hash){"^
       "  Write-Output 'Error: Failed to validate Maven wrapper SHA-256, your Maven wrapper might be tampered.';"^
       "  Write-Output 'Investigate or delete %WRAPPER_JAR% to attempt a clean download.';"^
       "  Write-Output 'If you updated your Maven version, you need to update the specified wrapperSha256Sum property.';"^
       "  exit 1;"^
       "}"^
       "}"
    if ERRORLEVEL 1 goto error
)

%MAVEN_JAVA_EXE% ^
  %JVM_CONFIG_MAVEN_PROPS% ^
  %MAVEN_OPTS% ^
  %MAVEN_DEBUG_OPTS% ^
  -classpath %WRAPPER_JAR% ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %*
if ERRORLEVEL 1 goto error
goto end

:error
set ERROR_CODE=1

:end
@endlocal & set ERROR_CODE=%ERROR_CODE%

IF NOT "%MAVEN_SKIP_RC%"=="" GOTO skipRcPost
@REM check for post script, once with legacy .bat ending and once with .cmd ending
IF EXIST "%USERPROFILE%\mavenrc_post.bat" CALL "%USERPROFILE%\mavenrc_post.bat"
IF EXIST "%USERPROFILE%\mavenrc_post.cmd" CALL "%USERPROFILE%\mavenrc_post.cmd"
:skipRcPost

@REM pause the script if MAVEN_BATCH_PAUSE is set to 'on'
IF "%MAVEN_BATCH_PAUSE%"=="on" PAUSE

IF "%MAVEN_TERMINATE_CMD%"=="on" EXIT %ERROR_CODE%

cmd /C exit /B %ERROR_CODE%
