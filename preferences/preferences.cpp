#include <QFileDialog>
#include "preferences.h"
#include "ui_preferences.h"
#include "settings.h"
#include "util/constants.h"

#define OPEN_DIRECTORY_TEXT "Open Directory"

Preferences::Preferences(QWidget *parent) : QDialog(parent), ui(new Ui::Preferences) {
    ui->setupUi(this);
    ui->lineEdit->setText(Settings::value(PATH, EMPTY_STRING).toString());
}

Preferences::~Preferences() {
    delete ui;
}

void Preferences::on_toolButton_clicked() {
    QString dir = QFileDialog::getExistingDirectory(
            this,
            tr(OPEN_DIRECTORY_TEXT),
            EMPTY_STRING,
            QFileDialog::ShowDirsOnly | QFileDialog::DontResolveSymlinks
    );

    Settings::setValue(PATH, dir);
    ui->lineEdit->setText(dir);
}

