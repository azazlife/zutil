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
    macroLibraries=''
    while getopts ':hi:o:l:m:d:' option; do
    case $option in
    h)
        printf 'usage: %s options\n\noptions:\n' `basename $0`
        printf '    -h                             print this help and exit.\n'
        printf '    -i  INPUT-FILE                 input assembler file.\n'
        printf '    -o  OUTPUT-FILE                output header file.\n'
        printf '    -l  OUTPUT-LISTING             output listing file.\n'
        printf '    -m  MACLIB                     assembly MACLIB.\n'
        printf '    -d  DSECT-CONVERSION-OPTIONS   DSECT conversion utility options.\n'
        exit
    ;;
    i)
        inputFile="$OPTARG"
    ;;
    o)
        outputFile="$OPTARG"
    ;;
    l)
        outputListingFile="$OPTARG"
    ;;
    m)
        macroLibraries="$macroLibraries -I$OPTARG"
    ;;
    d)
        conversionOptions="$OPTARG"
    ;;
    \?)
        echo "invalid option: -$OPTARG" >&2
        exit 8
    ;;
    esac
    done

    if [[ -z "$inputFile" ]]; then
        printf "missing input source file name\nsee '%s -h' for usage\n" `basename $0`
        exit 8
    fi
    if [[ -z "$outputFile" ]]; then
        printf "missing output source file name\nsee '%s -h' for usage\n" `basename $0`
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

function main {
    processCommandLineOptions $*

    temporaryADATA=`createTemporaryDataset 'UNIT(SYSALLDA) SPACE(20,20) TRACKS DSORG(PS) RECFM(V,B) LRECL(32756)'`
    printf "temporary SYSADATA '%s' created\n" "$temporaryADATA"
    export SYSADATA="$temporaryADATA"

    printf "assembling '%s' source file\n" "$inputFile"
    as $macroLibraries -o'/dev/null' --gadata="//'$temporaryADATA'" "$inputFile" 2>'/dev/null'

    temporarySYSPRINT=`createTemporaryDataset 'UNIT(SYSALLDA) SPACE(20,20) TRACKS'`
    printf "temporary SYSPRINT '%s' created\n" "$temporarySYSPRINT"
    export SYSPRINT="$temporarySYSPRINT"

    temporarySYSOUT=`createTemporaryDataset 'UNIT(SYSALLDA) SPACE(20,20) TRACKS'`
    printf "temporary SYSOUT '%s' created\n" "$temporarySYSOUT"
    export SYSOUT="$temporarySYSOUT"

    temporaryEDCDSECT=`createTemporaryDataset 'UNIT(SYSALLDA) SPACE(20,20) TRACKS DSORG(PS) RECFM(V,B) LRECL(255)'`
    printf "temporary EDCDSECT '%s' created\n" "$temporaryEDCDSECT"
    export EDCDSECT="$temporaryEDCDSECT"

    export TSOALLOC='SYSPRINT:SYSOUT:SYSADATA:EDCDSECT'
    echo 'executing CCNEDSCT'
    STEPLIB='CEE.SCEERUN2:CBC.SCCNCMP:CEE.SCEERUN' callISPSTART 'CCNEDSCT' "$conversionOptions" 1>'/dev/null' 2>'/dev/null'

    temporaryHeaderFile=`mktemp`
    cp "//'$temporaryEDCDSECT'" "$temporaryHeaderFile"
    printf "copying output to the '%s' file\n" "$outputFile"
    sed '1s/.*/#pragma pack(packed:C_Compat)/' "$temporaryHeaderFile" >"$outputFile"
    rm "$temporaryHeaderFile"

    printf "copying listing to the '%s' file\n" "$outputListingFile"
    cat "//'$temporarySYSOUT'" | tr '\x0c' '\x15' >"$outputListingFile"

    removeDataset "$temporaryADATA"
    removeDataset "$temporarySYSPRINT"
    removeDataset "$temporarySYSOUT"
    removeDataset "$temporaryEDCDSECT"
}

main $*
