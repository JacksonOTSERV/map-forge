#ifndef NOSBOR__MAINWINDOW_H
#define NOSBOR__MAINWINDOW_H

#include "preferences/settings.h"
#include "preferences/preferences.h"
#include <QMainWindow>

QT_BEGIN_NAMESPACE
namespace Ui { class MainWindow; }
QT_END_NAMESPACE

class MainWindow : public QMainWindow {
Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);

    static bool hasValidPaths();

    ~MainWindow() override;

private slots:

    void on_actionPreferences_triggered();

    void on_action_gay_memo_triggered();

    static void on_actionExit_triggered();

private:
    Ui::MainWindow *ui;
    Preferences *windowPreferences;
};


#endif //NOSBOR__MAINWINDOW_H
