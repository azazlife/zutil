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
    var username, password;
    var inputFile;
    var verbose;
    var printTableName;
    var printTableColumns;
    var formatAsCSV;
    var delimiter;

    for (var index = 0; index < parameters.length; index++) {
        if (parameters[index].match(/^(-h)|(--help)$/)) {
            this.parameters.help = true;
            this.printHelp();
            return;
        }

        if (parameters[index].match(/^(-t)|(--print-table-name)$/)) {
            printTableName = true; continue;
        }
        if (parameters[index].match(/^(-c)|(--print-table-columns)$/)) {
            printTableColumns = true; continue;
        }
        if (parameters[index].match(/^(-x)|(--format-as-csv)$/)) {
            formatAsCSV = true; continue;
        }
        if (parameters[index].match(/^(-v)|(--verbose)$/)) {
            verbose = true; continue;
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
        } else if (delimiter === '') {
            delimiter = parameters[index]; continue;
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
        var match = parameters[index].match(/^(?:(?:-d)|(?:--csv-delimiter=))(.+)?$/);
        if (match) {
            delimiter = match[1] ? match[1] : ''; continue;
        }

        throw new Error("invalid option '" + parameters[index] + "'\nsee 'sql.js -h' for usage");
    }

    if (!port || !location || !password) {
        var missingOptions = [];
        if (!port) {
            missingOptions.push('port');
        }
        if (!location) {
            missingOptions.push('location');
        }
        if (!password) {
            missingOptions.push('password');
        }
        throw new Error("missing options: " + missingOptions.join(', ') + "\nsee 'sql.js -h' for usage");
    }

    if (!username) {
        username = java.lang.System.getProperty('user.name');
    }
    if (!delimiter) {
        delimiter = ',';
    }

    this.parameters = {};
    this.parameters.hostname = hostname;
    this.parameters.port = port;
    this.parameters.location = location;
    this.parameters.username = username;
    this.parameters.password = password;
    this.parameters.inputFile = inputFile;
    this.parameters.verbose = verbose;
    this.parameters.printTableName = printTableName;
    this.parameters.printTableColumns = printTableColumns;
    this.parameters.formatAsCSV = formatAsCSV;
    this.parameters.delimiter = delimiter;
}

Application.prototype.printHelp = function() {
    var help = 'usage: sql.js options\n\noptions:\n';
    help += '    -h,          --help                     print this help and exit.\n';
    help += '    -s HOSTNAME, --hostname=HOSTNAME        subsystem hostname. If not specified \n';
    help += "                                            then 'localhost' will be used.\n";
    help += '    -p PORT,     --port=PORT                subsystem port.\n';
    help += '    -l LOCATION, --location=LOCATION        subsystem location.\n';
    help += '    -u USERNAME, --username=USERNAME        DB2 username. If not specified then \n';
    help += '                                            current user account name will be used.\n';
    help += '    -a PASSWORD, --password=PASSWORD        DB2 password.\n';
    help += '    -i INPUT,    --input-file=INPUT         input file containing SQL statements. \n';
    help += '                                            If not specified then SQL statements \n';
    help += '                                            would be read from the standard input.\n';
    help += '    -v,          --verbose                  enable verbose mode.\n';
    help += '    -t,          --print-table-name         print table name.\n';
    help += '    -c,          --print-table-columns      print table columns.\n';
    help += '    -x,          --format-as-csv            use CSV format.\n';
    help += '    -d,          --csv-delimiter=DELIMITER  CSV delimiter. If not specified then "," will be used.';
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

    java.lang.System.setProperty('db2.jcc.charsetDecoderEncoder', '3');
    java.lang.Class.forName('com.ibm.db2.jcc.DB2Driver');
    if (this.parameters.verbose) {
        java.lang.System.out.format("connecting to '%s:%d/%s' host%n", hostname, port, parameters.location);
    }
    this.connection = java.sql.DriverManager.getConnection(connectionURL, properties);
};

Application.prototype.printResultSetAsTable = function(resultSet) {
    var metaData = resultSet.getMetaData();
    var columnCount = metaData.getColumnCount();
    var columnNames = [];
    var columnWidths = [];

    for (var columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        var columnName = metaData.getColumnName(columnIndex + 1);
        columnNames.push(columnName);
        columnWidths.push(columnName.length());
    }

    var rowStrings = [];
    while (resultSet.next()) {
        var columnStrings = [];
        for (var columnIndex = 0; columnIndex < columnCount; columnIndex++) {
            var columnString = resultSet.getString(columnIndex + 1);
            columnStrings.push(columnString);
            if (!resultSet.wasNull() && columnString.length() > columnWidths[columnIndex]) {
                columnWidths[columnIndex] = columnString.length();
            }
        }
        rowStrings.push(columnStrings);
    }

    var tableName = metaData.getTableName(1);
    var schemaName = metaData.getSchemaName(1);
    if (schemaName.length()) {
        tableName = String(java.lang.String.format('%s.%s', schemaName, tableName));
    }

    var columnWidthsSum = columnWidths.reduce(function(previous, current) {
        return previous + current;
    }, 0);

    if (tableName.length > columnWidthsSum) {
        columnWidths[columnWidths.length - 1] = tableName.length;
    }

    var paddedColumnNames = [];
    for (var columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        var columnName = columnNames[columnIndex];
        var format = "%-" + columnWidths[columnIndex] + "s";
        paddedColumnNames.push(java.lang.String.format(format, columnName));
    }
    var lineLength = paddedColumnNames.join(' | ').length;

    var format = "| %-" + lineLength + "s |";
    var tableNameLine = java.lang.String.format(format, tableName);
    var headerLine = java.lang.String.format('| %s |', paddedColumnNames.join(' | '));

    var separatorLine = java.lang.String.format('+-%s-+', new Array(lineLength + 1).join('-'));
    if (this.parameters.printTableName) {
        print(separatorLine);
        print(tableNameLine);
    }
    if (this.parameters.printTableColumns) {
        print(separatorLine);
        print(headerLine);
    }
    print(separatorLine);

    for (var rowIndex = 0; rowIndex < rowStrings.length; rowIndex++) {
        var columnStrings = rowStrings[rowIndex];
        var paddedColumnStrings = [];

        for (var columnIndex = 0; columnIndex < columnCount; columnIndex++) {
            var columnString = columnStrings[columnIndex];
            var format = "%-" + columnWidths[columnIndex] + "s";
            paddedColumnStrings.push(java.lang.String.format(format, columnString));
        }

        print(java.lang.String.format('| %s |', paddedColumnStrings.join(' | ')));
    }

    print(separatorLine);
};

Application.prototype.printResultSetAsCSV = function(resultSet) {
    function formatStringAsCSV(string) {
        if (string.indexOf('\n') !== -1 || string.indexOf('"') !== -1 || string.indexOf(delimiter) !== -1) {
            string = '"' + string.replace(/"/g, '""') + '"';
        }
        return string;
    }

    var delimiter = this.parameters.delimiter;
    var metaData = resultSet.getMetaData();
    var columnCount = metaData.getColumnCount();

    if (this.parameters.printTableName) {
        var tableName = metaData.getTableName(1);
        var schemaName = metaData.getSchemaName(1);
        if (schemaName.length()) {
            tableName = schemaName + '.' + tableName;
        }
        print(tableName);
    }

    if (this.parameters.printTableColumns) {
        for (var columnIndex = 1; columnIndex <= columnCount; columnIndex++) {
            var outputLine = '';
            if (columnIndex > 1) {
                outputLine += delimiter;
            }
            outputLine += formatStringAsCSV(String(metaData.getColumnName(columnIndex)));
        }
        print(outputLine);
    }

    while (resultSet.next()) {
        var outputLine = '';
        for (var columnIndex = 1; columnIndex <= columnCount; columnIndex++) {
            if (columnIndex > 1) {
                outputLine += delimiter;
            }
            outputLine += formatStringAsCSV(String(resultSet.getString(columnIndex)));
        }
        print(outputLine);
    }
};

Application.prototype.executeCommand = function(command) {
    var statement = this.connection.createStatement();

    if (command.match(new RegExp('^\s*SELECT', 'i'))) {
        if (this.parameters.verbose) {
            print('executing query:');
            print(command);
        }
        var resultSet = statement.executeQuery(command);
        if (this.parameters.formatAsCSV) {
            this.printResultSetAsCSV(resultSet);
        } else {
            this.printResultSetAsTable(resultSet);
        }
    } else {
        if (this.parameters.verbose) {
            print('executing statement:');
            print(command);
        }
        var rowCount = new java.lang.Integer(statement.executeUpdate(command));
        if (this.parameters.verbose) {
            java.lang.System.out.format("%d rows affected%n", rowCount);
        }        
    }
};

Application.prototype.process = function(parameters) {
    /* process command line parameters */
    this.parseParameters(parameters);
    var parameters = this.parameters;
    if (parameters.help) {
        return 0;
    }

    this.connectToDB2();

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
        var match = line.match(/;\s*$/);
        if (match) {
            command += line;
            this.executeCommand(command);
            command = '';
        } else {
            if (command) {
                command += '\n';
            }
            command += line;
        }
    }

    if (command) {
        this.executeCommand(command);
    }

    return 0;
};

Application.prototype.run = function(parameters) {
    try {
        return this.process(parameters);
    } catch (error if error.javaException) {
        var javaException = error.javaException;
        var errorMessage = javaException.getMessage();
        if (javaException instanceof java.sql.SQLException) {
            var errorExpression = /(?:\[.*?\])* *(.+) (?:ERRORCODE|SQLCODE)=(-?\d+), SQLSTATE=([0-9ABCDEF]+)(, DRIVER=([0-9\.]+))?/;
            var messageMatch = String(errorMessage).match(errorExpression);
            var errorTitle;
            if (messageMatch) {
                errorMessage = messageMatch[1];
                var errorCode = messageMatch[2];
                errorTitle = 'SQL error ' + errorCode;
            } else {
                errorMessage = error.message;
                errorTitle = 'SQL error';
            }
        }
        java.lang.System.err.println(errorTitle + ':');
        java.lang.System.err.println(errorMessage);
        return 8;
    } catch (error) {
        java.lang.System.err.println(error.message);
        return 8;
    }
};

java.lang.System.exit(new Application().run(arguments));
