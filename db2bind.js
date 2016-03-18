#!/bin/env js

/* 
 * Copyright (C) Vadim Shchukin (vsshchukin@gmail.com) 2016
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

function Application() {
}

Application.prototype.parseParameters = function(parameters) {
    this.parameters = {};

    var hostname, port, location;
    var username, password
    var inputFile;
    var librariesDBRM;
    var replaceOption;
    var replaceOptions = {};

    for (var index = 0; index < parameters.length; index++) {
        if (parameters[index].match(/^(-h)|(--help)$/)) {
            this.parameters.help = true;
            return;
        }

        if (hostname === '') {
            hostname = parameters[index]; continue;
        } else if (port === '') {
            port = parameters[index]; continue;
        } else if (location === '') {
            location = parameters[index]; continue;
        } else if (username === '') {
            username = parameters[index]; continue;
        } else if (password === '') {
            password = parameters[index]; continue;
        } else if (inputFile === '') {
            inputFile = parameters[index]; continue;
        } else if (librariesDBRM === '') {
            librariesDBRM = parameters[index]; continue;
        } else if (replaceOption === '') {
            replaceOption = parameters[index];
        }

        var match = parameters[index].match(/^(?:(?:-s)|(?:--hostname=))(.+)?$/);
        if (match) {
            hostname = match[1] ? match[1] : ''; continue;
        }
        var match = parameters[index].match(/^(?:(?:-p)|(?:--port=))(.+)?$/);
        if (match) {
            port = match[1] ? match[1] : ''; continue;
        }
        var match = parameters[index].match(/^(?:(?:-l)|(?:--location=))(.+)?$/);
        if (match) {
            location = match[1] ? match[1] : ''; continue;
        }
        var match = parameters[index].match(/^(?:(?:-u)|(?:--username=))(.+)?$/);
        if (match) {
            username = match[1] ? match[1] : ''; continue;
        }
        var match = parameters[index].match(/^(?:(?:-a)|(?:--password=))(.+)?$/);
        if (match) {
            password = match[1] ? match[1] : ''; continue;
        }
        var match = parameters[index].match(/^(?:(?:-i)|(?:--input-file=))(.+)?$/);
        if (match) {
            inputFile = match[1] ? match[1] : ''; continue;
        }
        var match = parameters[index].match(/^(?:(?:-d)|(?:--dbrmlib=))(.+)?$/);
        if (match) {
            librariesDBRM = match[1] ? match[1] : ''; continue;
        }
        var match = parameters[index].match(/^(?:(?:-r)|(?:--replace=))(.+)?$/);
        if (match) {
            replaceOption = match[1] ? match[1] : '';
        }

        if (replaceOption) {
            var option = replaceOption.split('=');
            replaceOptions[option[0]] = option[1];
            replaceOption = undefined;
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

    this.parameters.hostname = hostname;
    this.parameters.port = port;
    this.parameters.location = location;
    this.parameters.username = username;
    this.parameters.password = password;
    this.parameters.inputFile = inputFile;
    this.parameters.librariesDBRM = librariesDBRM;
    this.parameters.replaceOptions = replaceOptions;
}

Application.prototype.printHelp = function() {
    var help = 'usage: db2bind.js options\n\noptions:\n';
    help += '    -h,              --help                   print this help\n';
    help += '    -s HOSTNAME,     --hostname=HOSTNAME      subsystem hostname. If not specified \n';
    help += "                                              then 'localhost' will be used.\n";
    help += '    -p PORT,         --port=PORT              subsystem port\n';
    help += '    -l LOCATION,     --location=LOCATION      subsystem location\n';
    help += '    -u USERNAME,     --username=USERNAME      DB2 username. If not specified then \n';
    help += '                                              current user account name will be used.\n';
    help += '    -a PASSWORD,     --password=PASSWORD      DB2 password\n';
    help += '    -i INPUT,        --input-file=INPUT       input file containing DSN commands. \n';
    help += '                                              If not specified then DSN commands \n';
    help += '                                              will be read from standard input.\n';
    help += '    -d DBRMLIBS,     --dbrmlib=DBRMLIBS       DBRM library data sets separated \n';
    help += '                                              by comma.\n';
    help += '    -r OPTION=VALUE, --replace=OPTION=VALUE   value of DSN command option to be replaced.';
    print(help);
};

Application.prototype.connectToDB2 = function() {
    var parameters = this.parameters;
    var properties = new java.util.Properties();
    properties.setProperty('user', parameters.username);
    properties.setProperty('password', parameters.password);
    properties.setProperty('retrieveMessagesFromServerOnGetMessage', true);

    var hostname = parameters.hostname ? parameters.hostname : 'localhost';
    var port = new java.lang.Integer(parameters.port);
    var connectionURL = 'jdbc:db2://' + hostname + ':' + port + '/' + parameters.location;

    java.lang.Class.forName('com.ibm.db2.jcc.DB2Driver');
    java.lang.System.out.format("connecting to '%s:%d/%s' host%n", hostname, port, parameters.location);
    this.connection = java.sql.DriverManager.getConnection(connectionURL, properties);
};

Application.prototype.getPDSMembers = function(datasetName) {
    var datasetMembers = [];
    var directory = new com.ibm.jzos.PdsDirectory("//'" + datasetName + "'");
    for (var iterator = directory.iterator(); iterator.hasNext();) {
        var member = iterator.next();
        datasetMembers.push(String(member.getName()));
    }
    return datasetMembers;
};

Application.prototype.readCommands = function() {
    var reader;
    if (this.parameters.inputFile) {
        reader = new java.io.FileReader(this.parameters.inputFile);
    } else {
        reader = new java.io.InputStreamReader(java.lang.System.in);
    }
    reader = new java.io.BufferedReader(reader);

    this.commands = [];
    var command = '';
    var line;
    while (line = reader.readLine()) {
        if (line.trim() == '') {
            continue;
        }
        var match = line.match(/^(.*?)\s*-\s*$/);
        if (match) {
            command += match[1] + java.lang.System.lineSeparator();
        } else {
            command += line;
            this.commands.push(command);
            command = '';
        }
    }
};

Application.prototype.prepareCommand = function(command) {
    var match = command.match(/MEMBER\s*\((.*?)\)/);
    if (match) {
        var memberName = match[1];
        var memberFound = false;
        for (var libraryDBRM in this.librariesDBRM) {
            if (this.librariesDBRM[libraryDBRM].indexOf(memberName) != -1) {
                memberFound = true;
                break;
            }
        }

        if (memberFound) {
            print("DBRM module '" + memberName + "' has been found in '" + libraryDBRM + "' data set");
            command += " LIBRARY ('" + libraryDBRM + "')";
        } else {
            print("DBRM module '" + memberName + "' not found in DBRMLIB concatenation");
        }
    }

    for (var replaceOptionName in this.parameters.replaceOptions) {
        var expression = new RegExp(replaceOptionName + '\\s*\\((.*?)\\)');
        var replaceOption = replaceOptionName + ' (' + this.parameters.replaceOptions[replaceOptionName] + ')';
        if (command.match(expression)) {
            command = command.replace(expression, replaceOption);
        } else {
            command += ' ' + replaceOption;
        }
    }

    return command;
};

Application.prototype.bind = function(parameters) {
    /* process command line parameters */
    this.parseParameters(parameters);
    var parameters = this.parameters;
    if (parameters.help) {
        this.printHelp();
        return;
    }

    this.connectToDB2();

    var namesDBRM = parameters.librariesDBRM.split(',');
    this.librariesDBRM = {};
    for (var nameIndex = 0; nameIndex < namesDBRM.length; nameIndex++) {
        var nameDBRM = namesDBRM[nameIndex];
        this.librariesDBRM[nameDBRM] = this.getPDSMembers(nameDBRM);
    }

    this.readCommands();

    var callStatement = this.connection.prepareCall('CALL SYSPROC.ADMIN_COMMAND_DSN (?, ?)');
    callStatement.registerOutParameter(2, java.sql.Types.VARCHAR);
    for (var commandIndex = 0; commandIndex < this.commands.length; commandIndex++) {
        var command = this.commands[commandIndex];

        print('executing command:');
        print(command);

        command = this.prepareCommand(command);

        callStatement.setString(1, command.replace(new RegExp(java.lang.System.lineSeparator(), 'g'), ''));
        callStatement.execute();
        var resultSet = callStatement.getResultSet();
        var lines = [];
        while (resultSet.next()) {
            print(resultSet.getString(2));
        }

        if (commandIndex < this.commands.length - 1) {
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
