# zutil
## Overview
Useful z/OS utilities.
## db2bind.js
### Overview
Utility to perform DB2 bind in USS.
### Dependencies
 - [IBM DB2 JDBC driver] and license.
 - [Rhino].
### Examples
Example:
```text
$ java -cp db2jcc.jar:db2jcc_license_cisuz.jar:rhino.jar org.mozilla.javascript.tools.shell.Main db2bind.js -p'DB2 port' -l'DB2 location' -a'DB2 password' -i'DSN commands file' -d'DBRMLIB'
```

[IBM DB2 JDBC driver]:http://www-01.ibm.com/support/docview.wss?uid=swg21363866
[Rhino]:https://developer.mozilla.org/en-US/docs/Mozilla/Projects/Rhino
