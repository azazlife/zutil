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
```text
$ JS='java -cp db2jcc.jar:db2jcc_license_cisuz.jar:rhino.jar org.mozilla.javascript.tools.shell.Main'
$ $JS -p'DB2 port' -l'DB2 location' -a'DB2 password' -i'DSN commands file' -d'DBRMLIB'
```

[IBM DB2 JDBC driver]:http://www-01.ibm.com/support/docview.wss?uid=swg21363866
[Rhino]:https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino
