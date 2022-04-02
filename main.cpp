#include "mainwindow.h"
#include "preferences/settings.h"
#include "otlib/graphics/spriteManager.h"
#include <cmrc/cmrc.hpp>
#include <QApplication>
#include <QTranslator>
#include <QtGui>
#include "util/constants.h"
#include "otlib/graphics/spriteManager.h"

bool hasValidPaths();

CMRC_DECLARE(nosbor);

void setTheme(MainWindow *window) {
    auto fs = cmrc::nosbor::get_filesystem();
    auto fd = fs.open("resources/theme.qss");

    QString styleSheet;
    styleSheet = QLatin1String(fd.begin(), fd.end());
    window->setStyleSheet(styleSheet);
}

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    Settings settings;
    MainWindow window;

    setTheme(&window);
    window.show();

    hasValidPaths();

    return QApplication::exec();
}

bool hasValidPaths() {
    QString Client_path = Settings::value(PATH, EMPTY_STRING).toString();

    // TODO: ssdf vc bateu com a cara no teclado ou significa algo? puta desgraçada
    qDebug() << "Client ssdf: " << Client_path.isEmpty();

    if (Client_path.isEmpty()) {
        return false;
    }

    spriteManager::loadSpr(Client_path);

    // TODO: fazer certo
    // std::string metadata = Client_path.toStdString() + "/Tibia.dat";
    // const char *sprites = "D:/Program Files/Tibia860/Tibia.spr";

    // Sprites *spritesClass = new Sprites(sprites, "w");
    // qDebug() << "Sprites: " << spritesClass->sprGetC();

    return true;
}