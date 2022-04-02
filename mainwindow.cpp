#include "mainwindow.h"
#include "ui_mainwindow.h"
#include "preferences/settings.h"


MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent), ui(new Ui::MainWindow) {
    ui->setupUi(this);
}

MainWindow::~MainWindow() {
    delete ui;
}

void MainWindow::on_actionPreferences_triggered() {
    windowPreferences= new Preferences(this);
    windowPreferences->show();
}

void MainWindow::on_action_gay_memo_triggered() {
    windowPreferences= new Preferences(this);
    windowPreferences->show();
}

void MainWindow::on_actionExit_triggered() {
    QApplication::quit();
}

