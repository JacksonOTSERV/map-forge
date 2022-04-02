#include "settings.h"

Settings *Settings::s_instance = nullptr;

Settings::Settings()
{
    Q_ASSERT(s_instance == nullptr);
    s_instance = this;
}

Settings::~Settings()
{
    Q_ASSERT(s_instance != nullptr);
    s_instance = nullptr;
}

bool Settings::contains(const QString &key) {
    return s_instance->m_settings->contains(key);
}

QVariant Settings::value(const QString &key, const QVariant &defaultValue) {
    return s_instance->m_settings->value(key, defaultValue);
}


void Settings::setValue(const QString &key, const QVariant &value) {
    s_instance->m_settings->setValue(key, value);
}