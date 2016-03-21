function trimString(string) {
    sub(/[ \t\r\n]+$/, "", string)
    return string
}

function escapeTargetName(targetName) {
    gsub(" ", "\\\\ ", targetName)
    gsub("#", "\\\\#", targetName)
    gsub("\$", "$$", targetName)
    return targetName
}

BEGIN {
    macroSummary = 0
    assemblerSummary = 0
    libraryName = ""
    macroCount = 0
    objectName = ""
}
{
    line = $0
    firstCharacter = substr(line, 1, 1)
    if (firstCharacter == "1") {
        macroSummary = index(line, "Macro and Copy Code Source Summary") != 0
        assemblerSummary = index(line, "Diagnostic Cross Reference and Assembler Summary") != 0
    }
    if (macroSummary && firstCharacter == " ") {
        line = substr(line, 7)

        sourceName = substr(line, 1, 44)
        sourceName = trimString(sourceName)
        if (length(sourceName) > 0) {
            libraryName = sourceName
        }

        if (substr(libraryName, 1, 1) != "/") {
            next
        }
        memberCount = split(substr(line, 57), members, " ")
        for (memberIndex = 1; memberIndex <= memberCount; memberIndex++) {
            macros[macroCount++] = escapeTargetName(libraryName "/" members[memberIndex])
        }
    } else if (assemblerSummary && firstCharacter == " ") {
        if (trimString(substr(line, 7, 8)) == "SYSLIN") {
            objectName = escapeTargetName(trimString(substr(line, 16)))
        }
    }
}
END {
    for (macroIndex = 0; macroIndex < macroCount; macroIndex++) {
        print(objectName ": " macros[macroIndex])
    }
}
