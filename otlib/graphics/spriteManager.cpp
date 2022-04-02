#include <string>
#include <QMessageBox>
#include "spriteManager.h"
#include <QApplication>
#include <iostream>
#include <fstream>
#include <physfs.h>

char *copy(const char *orig) {
    char *res = new char[strlen(orig) + 1];
    strcpy(res, orig);
    return res;
}

typedef struct tibiaspr {
    unsigned int version;
    unsigned short count;
} TIBIA_SPRITE_HEADER;

uint32_t getU32(FILE *m_fileHandle)
{
    uint32_t v = 0;
    if(!m_caching) {
        if(PHYSFS_readULE32(m_fileHandle, &v) == 0)
           QMessageBox::critical(nullptr, "Error", "Reading Error");
    } else {
        if(m_pos+4 > m_data.size())
            throwError("read failed");

        v = stdext::readULE32(&m_data[m_pos]);
        m_pos += 4;
    }
    return v;
}

bool spriteManager::loadSpr(const QString &fullPath) {
    long lSize;
    char *buffer;
    size_t result;
    FILE *fp;

    try {
        // read file stream
        char *filePath = copy(fullPath.toStdString().c_str());;
        const char *fileName = "/Tibia.spr";
        const char *fileFullPath = strcat(filePath, fileName);
        fp = fopen(fileFullPath, "rb");

        qDebug() << "fileFullPath: " << fileFullPath;

        TIBIA_SPRITE_HEADER tsh;
        fread(&tsh, sizeof(TIBIA_SPRITE_HEADER), 1, fp);
        qDebug() << "Sprite version: " << tsh.version;
        qDebug() << "Sprite count: " << tsh.count;

//        if (fp == nullptr) {
//            QMessageBox::critical(nullptr, "Error", "Can't open file");
//            return false;
//        }
//
//        fseek(fp, 0, SEEK_SET);
//        lSize = ftell(fp);
//        rewind(fp);
//        buffer = (char *) malloc(sizeof(char) * lSize);
//
//        if (buffer == nullptr) {
//            QMessageBox::critical(nullptr, "Error", "Memory Error");
//            return false;
//        }
//
//        result = fread(buffer, 1, 1, fp);
//
//        if (result != lSize) {
//            QMessageBox::critical(nullptr, "Error", "Reading Error");
//            return false;
//        }

        qDebug() << "Loading sprite: " << result;
    } catch (std::exception &e) {
        QMessageBox::critical(nullptr, "Error", e.what());
        return false;
    }


    // terminate
    fclose(fp);
    free(buffer);
    return true;
}
