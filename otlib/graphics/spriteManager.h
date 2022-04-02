#ifndef NOSBOR__SPRITEMANAGER_H
#define NOSBOR__SPRITEMANAGER_H
#include <string>
#include <cstdint>
#include <iostream>
#include <fstream>

class spriteManager {
public:
    static bool loadSpr(const QString& file);

private:
    static uint32_t *m_signature;
    static std::ifstream m_spritesFile;
    typedef struct tibiaspr TIBIA_SPRITE_HEADER;
//    int m_spritesCount;
//    int m_spritesOffset;
};


#endif //NOSBOR__SPRITEMANAGER_H
