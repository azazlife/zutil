# zutil
## Overview
Useful z/OS utilities.
## db2bind.js
### Overview
Utility to perform DB2 bind in USS.
### Dependencies
 - [IBM DB2 JDBC driver] and license.
 - [Rhino].

### Command line arguments
```text
-h,              --help                   print this help
-s HOSTNAME,     --hostname=HOSTNAME      subsystem hostname. If not specified
                                          then 'localhost' will be used.
-p PORT,         --port=PORT              subsystem port
-l LOCATION,     --location=LOCATION      subsystem location
-u USERNAME,     --username=USERNAME      DB2 username. If not specified then
                                          current user account name will be used.
-a PASSWORD,     --password=PASSWORD      DB2 password
-i INPUT,        --input-file=INPUT       input file containing DSN commands.
                                          If not specified then DSN commands
                                          will be read from standard input.
-d DBRMLIBS,     --dbrmlib=DBRMLIBS       DBRM library data sets separated
                                          by comma.
-r OPTION=VALUE, --replace=OPTION=VALUE   value of DSN command option to be replaced.
```

### Examples
Example:
```sh
$ JS='java -cp db2jcc.jar:db2jcc_license_cisuz.jar:rhino.jar org.mozilla.javascript.tools.shell.Main'
$ $JS db2bind.js -p'DB2 port' -l'DB2 location' -a'DB2 password' -i'DSN commands file' -d'DBRMLIB'
```

## sql.js
### Overview
SQL JDBC command line client for DB2 for z/OS. Support data exporting in CSV format.
### Dependencies
 - [IBM DB2 JDBC driver] and license.
 - [Rhino].

### Command line arguments
```text
-h,          --help                     print this help and exit.
-s HOSTNAME, --hostname=HOSTNAME        subsystem hostname. If not specified
                                        then 'localhost' will be used.
-p PORT,     --port=PORT                subsystem port.
-l LOCATION, --location=LOCATION        subsystem location.
-u USERNAME, --username=USERNAME        DB2 username. If not specified then
                                        current user account name will be used.
-a PASSWORD, --password=PASSWORD        DB2 password.
-i INPUT,    --input-file=INPUT         input file containing SQL statements.
                                        If not specified then SQL statements
                                        would be read from the standard input.
-v,          --verbose                  enable verbose mode.
-t,          --print-table-name         print table name.
-c,          --print-table-columns      print table columns.
-x,          --format-as-csv            use CSV format.
-d,          --csv-delimiter=DELIMITER  CSV delimiter. If not specified then "," will be used.
```

### Examples
Example:
```sh
$ JS='java -cp db2jcc.jar:db2jcc_license_cisuz.jar:rhino.jar org.mozilla.javascript.tools.shell.Main'
$ echo "SELECT 'TEST' FROM SYSIBM.SYSDUMMY1" | $JS sql.js -p'DB2 port' -l'DB2 location' -a'DB2 password' -v -t -c
```

## db2prep.sh
### Overview
Utility to call DB2 preprocessor.
## Command line arguments
```text
-h                  print this help and exit.
-l  DB2-LOADLIB     DB2 LOADLIB containing DSNHPC.
-i  INPUT-FILE      input source file.
-o  OUTPUT-FILE     output source file.
-d  OUTPUT-DBRMLIB  DBRMLIB.
-s  OUTPUT-LISTING  output listing file.
-p  OPTIONS         preprocessor options.
```
### Dependencies
 - [bash].
 - [mktemp].

## Examples
Example:
```sh
$ db2prep.sh -i"input source file" -o"output source file" -d"output DBRMLIB data set" -p"preprocessor options" -l"DB2 STEPLIB" -s"output listing file"
```

## dsect.sh
### Overview
Utility to convert HLASM DSECT structures to C/C++ headers.
## Command line arguments
```text
-h                             print this help and exit.
-i  INPUT-FILE                 input assembler file.
-o  OUTPUT-FILE                output header file.
-l  OUTPUT-LISTING             output listing file.
-m  MACLIB                     assembly MACLIB.
-d  DSECT-CONVERSION-OPTIONS   DSECT conversion utility options.
```
### Dependencies
 - [bash].
 - [mktemp].

## Examples
Example:
```sh
$ dsect.sh -i"input assembler file" -o"output header file" -l"output listing file" -m"assembler MACLIB"
```

## asmlist.awk
### Overview
Utility to generate makefile dependencies from HLASM listing.
## Examples
Example:
```sh
cat "input assembler listing file" | awk -f"asmlist.awk"
```

[IBM DB2 JDBC driver]:http://www-01.ibm.com/support/docview.wss?uid=swg21363866
[Rhino]:https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino
[bash]:http://www.rocketsoftware.com/ported-tools/bash-4253
[mktemp]:https://www.rocketsoftware.com/ported-tools/mktemp-17
