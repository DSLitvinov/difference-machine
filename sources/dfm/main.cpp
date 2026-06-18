#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QUrl>

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);
    app.setApplicationName(QStringLiteral("DFM UI Kit Gallery"));
    app.setOrganizationName(QStringLiteral("DifferenceMachine"));

    QQmlApplicationEngine engine;
    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreationFailed,
        &app,
        []() { QCoreApplication::exit(-1); },
        Qt::QueuedConnection);

    engine.loadFromModule(QStringLiteral("Dfm.UiKit"), QStringLiteral("UiKitGallery"));

    if (engine.rootObjects().isEmpty())
        return -1;

    return app.exec();
}
