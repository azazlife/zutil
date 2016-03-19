#/bin/env bash

# Copyright (C) Vadim Shchukin (vsshchukin@gmail.com) 2016
# 
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

function processCommandLineOptions {
    while getopts ':hl:i:o:d:s:p:' option; do
    case $option in
    h)
        printf 'usage: %s options\n\noptions:\n' `basename $0`
        printf '    -h                  print this help and exit.\n'
        printf '    -l  DB2-LOADLIB     DB2 LOADLIB containing DSNHPC.\n'
        printf '    -i  INPUT-FILE      input source file.\n'
        printf '    -o  OUTPUT-FILE     output source file.\n'
        printf '    -d  OUTPUT-DBRMLIB  DBRMLIB.\n'
        printf '    -s  OUTPUT-LISTING  output listing file.\n'
        printf '    -p  OPTIONS         preprocessor options.\n'
        exit
    ;;
    l)
        inputLOADLIB="$OPTARG"
    ;;
    i)
        inputFile="$OPTARG"
    ;;
    o)
        outputFile="$OPTARG"
    ;;
    d)
        outputDBRMLIB="$OPTARG"
    ;;
    s)
        outputListingFile="$OPTARG"
    ;;
    p)
        preprocessorOptions="$OPTARG"
    ;;
    \?)
        echo "invalid option: -$OPTARG" >&2
        exit 8
    ;;
    esac
    done

    if [[ -z "$inputLOADLIB" ]]; then
        printf "missing DB2 LOADLIB\nsee '%s -h' for usage\n" `basename $0`
        exit 8
    fi
    if [[ -z "$inputFile" ]]; then
        printf "missing input source file name\nsee '%s -h' for usage\n" `basename $0`
        exit 8
    fi
    if [[ -z "$outputFile" ]]; then
        printf "missing output source file name\nsee '%s -h' for usage\n" `basename $0`
        exit 8
    fi
    if [[ -z "$outputDBRMLIB" ]]; then
        printf "missing output DBRMLIB\nsee '%s -h' for usage\n" `basename $0`
        exit 8
    fi
}

function createTemporaryDataset { # create a temporary data set with a specified allocation parameters
    while true; do # while data set is not defined
        datasetName="$LOGNAME.T$RANDOM" # generate random temporary data set name
        commandOutput=`tso "ALLOC DA('$datasetName') NEW CATALOG $1" 2>/dev/null` # execute TSO ALLOC command
        if [[ "$commandOutput" != *"NOT DEFINED BECAUSE DUPLICATE NAME EXISTS IN CATALOG"* ]]; then # if data set name is unique
            break # then break the loop
        fi
    done
    echo "$datasetName"
}

function removeDataset { # remove a specified data set
    export SYSIN="ALLOC DA('$1') MOD DELETE" # allocate data set to delete
    export TSOALLOC=SYSIN
    commandOutput=`tso 2>&1` # execute tso command
    if [[ "$commandOutput" == *"FOMF0135I"* ]]; then # check for "Command too long or all blanks" message
        return 0 # return successfully
    fi
}

function callISPSTART { # starts a specified program through ISPF services
    export ISPPROF='ALLOC NEW UNIT(SYSVIO) SPACE(1,1) CYL DIR(5) RECFM(F,B) LRECL(80) BLKSIZE(3120)'
    export ISPPLIB=ISP.SISPPENU
    export ISPSLIB=ISP.SISPSLIB
    export ISPTLIB=ISP.SISPTENU
    export ISPMLIB=ISP.SISPMENU
    export TSOALLOC=$TSOALLOC:ISPPROF:ISPPLIB:ISPSLIB:ISPTLIB:ISPMLIB
    tso "ISPSTART PGM($1) PARM($2)"
}

function formatSourceCode {
    awk -v limit=$1 '
    {
        line = $0
        result = ""
        while (length(line) > limit) {
            space = -1
            for (number = limit; number > 1; number--) {
                character = substr(line, number, 1)
                if (character == " ") {
                    space = number
                    break
                }
            }
            if (space == -1) {
                print("space not found")
                exit
            }
            result = result substr(line, 1, space - 1) "\\\n"
            line = substr(line, space)
        }
        result = result line
        print(result)
    }'
}

function callDB2Preprocessor {
    temporarySYSIN=`createTemporaryDataset 'RECFM(F,B) LRECL(80) BLKSIZE(8800) SPACE(20,20) TRACKS'` # allocate temporary SYSIN
    printf "temporary SYSIN '%s' created\n" "$temporarySYSIN"
    export SYSIN=$temporarySYSIN

    if [[ "$preprocessorOptions" == *"HOST(CPP)"* ]]; then # if it's a C/C++ source code
        printf "preparing '%s' source file\n" "$inputFile"
        formatterOutput=`mktemp` # create temporary output formatter file
        # format input source code to accommodate 72 characters line width restriction
        cat "$inputFile" | formatSourceCode 72 >"$formatterOutput"
        cp "$formatterOutput" "//'$temporarySYSIN'" # copy formatter output to the temporary SYSIN
        rm "$formatterOutput" # remove temporary formatter output
    else
        cp "$inputFile" `dsname $temporarySYSIN`
    fi

    inputFile=`basename $inputFile`
    moduleName="${inputFile%.*}"
    
    temporarySYSPRINT=`createTemporaryDataset 'UNIT(SYSALLDA) SPACE(20,20) TRACKS'` # create temporaary SYSPRINT
    printf "temporary SYSPRINT '%s' created\n" "$temporarySYSPRINT"
    export SYSPRINT=$temporarySYSPRINT

    temporarySYSCIN=`createTemporaryDataset 'UNIT(SYSALLDA) RECFM(F,B) LRECL(80) SPACE(20,20) TRACKS'` # create temporary SYSCIN
    printf "temporary SYSCIN '%s' created\n" "$temporarySYSCIN"
    export SYSCIN=$temporarySYSCIN

    temporaryDBRMLIB=`createTemporaryDataset 'UNIT(SYSALLDA) SPACE(20,20) TRACKS DIR(1) DSORG(PO) RECFM(F,B) LRECL(80) DSNTYPE(LIBRARY)'`
    printf "temporary DBRMLIB '%s' created\n" "$temporaryDBRMLIB"
    temporaryDBRMLIB="$temporaryDBRMLIB($moduleName)"
    export DBRMLIB=$temporaryDBRMLIB

    export SYSUT1='ALLOC NEW UNIT(SYSVIO) SPACE(1,1) CYL'
    export SYSUT2='ALLOC NEW UNIT(SYSVIO) SPACE(1,1) CYL'
    export TSOALLOC=SYSIN:SYSPRINT:SYSCIN:DBRMLIB:SYSUT1:SYSUT2

    echo 'executing DSNHPC'
    STEPLIB="$inputLOADLIB" callISPSTART 'DSNHPC' "$preprocessorOptions" 2>/dev/null

    listing=`cat "//'$temporarySYSPRINT'" | tr '\x0c' '\x15'`
    removeDataset "$temporarySYSIN"
    returnCode=`echo "$listing" | tail -1 | sed -E 's/RETURN CODE IS (.*)/\1/'`
    printf 'return code from the preprocessor is %d\n' "$returnCode"

    removeDataset "$temporarySYSPRINT"

    printf "copying output to the '%s' file\n" "$outputFile"
    cp "//'$temporarySYSCIN'" "$outputFile"
    removeDataset "$temporarySYSCIN"

    printf "copying DBRM module to the '%s' data set\n" "$outputDBRMLIB"
    cp "//'$temporaryDBRMLIB'" "//'$outputDBRMLIB($moduleName)'"
    removeDataset "$temporaryDBRMLIB"

    if [[ -n "$outputListingFile" ]]; then
        printf "copying listing to the '%s' file\n" "$outputListingFile"
        echo "$listing" >"$outputListingFile"
    fi

    return $returnCode
}

function main {
    processCommandLineOptions $*
    callDB2Preprocessor
}

main $*
