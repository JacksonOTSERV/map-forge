#pragma once
#include <QDir>
#include <QSettings>

class Settings
{
public:
    Settings();
    ~Settings();

    static bool contains(const QString &key);
    static QVariant value(const QString &key, const QVariant &defaultValue = QVariant());
    static void setValue(const QString &key, const QVariant &value);

private:
    static Settings *s_instance;
    QSettings* m_settings = new QSettings(QDir::currentPath() + "/nosbor.cfg", QSettings::IniFormat);;
};