#!/bin/env js

function Application() {
}

Application.prototype.parseParameters = function(parameters) {
    var hostname, port, location;
    var username, password
    var inputFile;
    var librariesDBRM;
    for (var index = 0; index < parameters.length; index++) {
        if (parameters[index].match(/^(-h)|(--help)$/)) {
            return {help: true};
        }
        if (hostname === '') {
            hostname = parameters[index];
            continue;
        } else if (port === '') {
            port = parameters[index];
            continue;
        } else if (location === '') {
            location = parameters[index];
            continue;
        } else if (username === '') {
            username = parameters[index];
            continue;
        } else if (password === '') {
            password = parameters[index];
            continue;
        } else if (inputFile === '') {
            inputFile = parameters[index];
            continue;
        } else if (librariesDBRM === '') {
            librariesDBRM = parameters[index];
            continue;
        }
        var match = parameters[index].match(/^(?:(?:-s)|(?:--hostname=))(.+)?$/);
        if (match) {
            hostname = match[1] ? match[1] : '';
            continue;
        }
        var match = parameters[index].match(/^(?:(?:-p)|(?:--port=))(.+)?$/);
        if (match) {
            port = match[1] ? match[1] : '';
            continue;
        }
        var match = parameters[index].match(/^(?:(?:-l)|(?:--location=))(.+)?$/);
        if (match) {
            location = match[1] ? match[1] : '';
            continue;
        }
        var match = parameters[index].match(/^(?:(?:-u)|(?:--username=))(.+)?$/);
        if (match) {
            username = match[1] ? match[1] : '';
            continue;
        }
        var match = parameters[index].match(/^(?:(?:-a)|(?:--password=))(.+)?$/);
        if (match) {
            password = match[1] ? match[1] : '';
            continue;
        }
        var match = parameters[index].match(/^(?:(?:-i)|(?:--input-file=))(.+)?$/);
        if (match) {
            inputFile = match[1] ? match[1] : '';
            continue;
        }
        var match = parameters[index].match(/^(?:(?:-d)|(?:--dbrmlib=))(.+)?$/);
        if (match) {
            librariesDBRM = match[1] ? match[1] : '';
            continue;
        }
    }
    if (!port || !location || !password || !librariesDBRM) {
        var option;
        if (!port) {
            option = 'port';
        } else if (!location) {
            option = 'location';
        } else if (!password) {
            option = 'password';
        } else if (!librariesDBRM) {
            option = 'DBRM libraries';
        }
        throw new Error("missing " + option + "\nsee 'bind.js -h' for usage");
    }
    if (!username) {
        username = java.lang.System.getProperty('user.name');
    }
    parameters = {};
    parameters.hostname = hostname;
    parameters.port = port;
    parameters.location = location;
    parameters.username = username;
    parameters.password = password;
    parameters.inputFile = inputFile;
    parameters.librariesDBRM = librariesDBRM;
    return parameters;
}

Application.prototype.printHelp = function() {
    var help = 'usage: bind.js options\n\noptions:\n';
    help += '    -h,          --help                 print this help\n';
    help += '    -s HOSTNAME, --hostname=HOSTNAME    subsystem hostname. If not specified \n';
    help += "                                        then 'localhost' will be used.\n";
    help += '    -p PORT,     --port=PORT            subsystem port\n';
    help += '    -l LOCATION, --location=LOCATION    subsystem location\n';
    help += '    -u USERNAME, --username=USERNAME    DB2 username. If not specified then \n';
    help += '                                        current user account name will be used.\n';
    help += '    -a PASSWORD, --password=PASSWORD    DB2 password\n';
    help += '    -i INPUT,    --input-file=INPUT     input file containing DSN commands. \n';
    help += '                                        If not specified then DSN commands \n';
    help += '                                        will be read from standard input.\n';
    help += '    -d DBRMLIBS,  --dbrmlib=DBRMLIBS    DBRM library data sets separated \n';
    help += '                                        by comma.';
    print(help);
};

Application.prototype.bind = function(parameters) {
    var parameters = this.parseParameters(parameters);
    if (parameters.help) {
        this.printHelp();
        return;
    }

    java.lang.Class.forName('com.ibm.db2.jcc.DB2Driver');
    var properties = new java.util.Properties();
    properties.setProperty('user', parameters.username);
    properties.setProperty('password', parameters.password);
    properties.setProperty('retrieveMessagesFromServerOnGetMessage', true);
    var hostname = parameters.hostname ? parameters.hostname : 'localhost';
    var connectionURL = 'jdbc:db2://' + hostname + ':' + parameters.port + '/' + parameters.location;
    var connection = java.sql.DriverManager.getConnection(connectionURL, properties);

    var namesDBRM = parameters.librariesDBRM.split(',');
    var librariesDBRM = {};
    for (var nameIndex = 0; nameIndex < namesDBRM.length; nameIndex++) {
        var nameDBRM = namesDBRM[nameIndex];
        var directory = new com.ibm.jzos.PdsDirectory("//'" + nameDBRM + "'");
        for (var iterator = directory.iterator(); iterator.hasNext();) {
            var member = iterator.next();
            if (!librariesDBRM[nameDBRM]) {
                librariesDBRM[nameDBRM] = [];
            }
            librariesDBRM[nameDBRM].push(String(member.getName()));
        }
    }

    var reader;
    if (parameters.inputFile) {
        reader = new java.io.FileReader(parameters.inputFile);
    } else {
        reader = new java.io.InputStreamReader(java.lang.System.in);
    }
    reader = new java.io.BufferedReader(reader);
    var command = '';
    var commands = [];
    var line;
    while (line = reader.readLine()) {
        var match = line.match(/^(.*?)\s*-\s*$/);
        if (match) {
            command += match[1];
        } else {
            command += line;
            commands.push(command);
            command = '';
        }
    }

    var statement = connection.prepareCall('CALL SYSPROC.ADMIN_COMMAND_DSN(?, ?)');
    statement.registerOutParameter(2, java.sql.Types.VARCHAR);
    for (var commandIndex = 0; commandIndex < commands.length; commandIndex++) {
        var command = commands[commandIndex];

        var match = command.match(/MEMBER\s*\((.*?)\)/);
        if (match) {
            var memberName = match[1];
            var memberFound = false;
            for (var libraryDBRM in librariesDBRM) {
                if (librariesDBRM[libraryDBRM].indexOf(memberName) != -1) {
                    memberFound = true;
                    break;
                }
            }
            if (memberFound) {
                print("DBRM module '" + memberName + "' found in '" + libraryDBRM + "' data set");
                command += " LIBRARY('" + libraryDBRM + "')";
            } else {
                print("DBRM module '" + memberName + "' not found in DBRMLIB concatenation");
                continue;
            }
        }

        statement.setString(1, command);
        statement.execute();
        var resultSet = statement.getResultSet();
        var lines = [];
        while (resultSet.next()) {
            lines.push(resultSet.getString(2));
        }
        print(lines.join('\n'));
        if (commandIndex < commands.length - 1) {
            print(Array(80).join('-'));
        }
    }
};

Application.prototype.run = function(parameters) {
    try {
        this.bind(parameters);
        return 0;
    } catch (error if error.javaException) {
        java.lang.System.err.println(error.javaException.getMessage());
        return 8;
    } catch (error) {
        java.lang.System.err.println(error.message);
        return 8;
    }
};

java.lang.System.exit(new Application().run(arguments));
