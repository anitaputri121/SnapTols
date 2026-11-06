#!/usr/bin/env python3
import os
import sys
import shutil
import subprocess
from PIL import Image

def run(cmd, cwd=None):
    print(f"[RUN] {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"[ERROR] Command failed with return code {res.returncode}")
        print("STDOUT:", res.stdout)
        print("STDERR:", res.stderr)
        sys.exit(res.returncode)
    return res.stdout

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_dir = os.path.join(root_dir, "dist")
    android_jar = "/usr/lib/android-sdk/platforms/android-23/android.jar"
    icon_src = os.path.join(root_dir, "public", "assets", "aistudio", "0bccde96a0fd5264aa10453cdfbe7f70_587ca20b.jpg")
    output_apk = os.path.join(root_dir, "Downloader_by_Anita_Putri.apk")

    if not os.path.exists(dist_dir):
        print("dist directory not found. Building web app first...")
        run("npm run build", cwd=root_dir)

    build_dir = os.path.join(root_dir, "android_build")
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    src_dir = os.path.join(build_dir, "src", "com", "anitaputri", "downloader")
    res_dir = os.path.join(build_dir, "res")
    assets_dir = os.path.join(build_dir, "assets", "www")
    gen_dir = os.path.join(build_dir, "gen")
    obj_dir = os.path.join(build_dir, "obj")
    bin_dir = os.path.join(build_dir, "bin")

    os.makedirs(src_dir, exist_ok=True)
    os.makedirs(res_dir, exist_ok=True)
    os.makedirs(assets_dir, exist_ok=True)
    os.makedirs(gen_dir, exist_ok=True)
    os.makedirs(obj_dir, exist_ok=True)
    os.makedirs(bin_dir, exist_ok=True)

    # 1. Generate Icons
    img = Image.open(icon_src).convert("RGBA")
    icon_sizes = {
        "mipmap-mdpi": (48, 48),
        "mipmap-hdpi": (72, 72),
        "mipmap-xhdpi": (96, 96),
        "mipmap-xxhdpi": (144, 144),
        "mipmap-xxxhdpi": (192, 192),
        "drawable": (96, 96)
    }
    for folder, size in icon_sizes.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        resized = img.resize(size, Image.Resampling.LANCZOS)
        resized.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")

    # 2. Strings and Styles
    values_dir = os.path.join(res_dir, "values")
    os.makedirs(values_dir, exist_ok=True)
    with open(os.path.join(values_dir, "strings.xml"), "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">SnapTool</string>
</resources>''')

    with open(os.path.join(values_dir, "styles.xml"), "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.NoTitleBar">
        <item name="android:windowBackground">@android:color/black</item>
    </style>
</resources>''')

    # 3. AndroidManifest.xml
    manifest_path = os.path.join(build_dir, "AndroidManifest.xml")
    with open(manifest_path, "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.anitaputri.downloader"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/ic_launcher"
        android:theme="@style/AppTheme"
        android:hardwareAccelerated="true"
        android:allowBackup="true">
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>''')

    # 4. MainActivity.java
    main_activity_path = os.path.join(src_dir, "MainActivity.java")
    with open(main_activity_path, "w") as f:
        f.write('''package com.anitaputri.downloader;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.ConsoleMessage;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setAllowFileAccessFromFileURLs(true);
        ws.setAllowUniversalAccessFromFileURLs(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        ws.setBuiltInZoomControls(false);
        ws.setDisplayZoomControls(false);

        // Ensure user agent identifies modern mobile Android
        String customUA = ws.getUserAgentString() + " DownloaderAnitaPutri/1.0";
        ws.setUserAgentString(customUA);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (url.contains("whatsapp.com") || url.contains("youtube.com")) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                            return true;
                        } catch (Exception ignored) {}
                    }
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                }
                uploadMessage = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(intent, "Pilih Berkas / Gambar"), FILECHOOSER_RESULTCODE);
                } catch (Exception e) {
                    uploadMessage = null;
                    Toast.makeText(MainActivity.this, "Tidak dapat membuka galeri berkas", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setData(Uri.parse(url));
                    startActivity(intent);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Mengunduh berkas: " + url, Toast.LENGTH_SHORT).show();
                }
            }
        });

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (uploadMessage == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            }
            uploadMessage.onReceiveValue(results);
            uploadMessage = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
''')

    # 5. Copy dist assets to android_project/assets/www
    print("[1/6] Copying web application build to android assets...")
    for item in os.listdir(dist_dir):
        s = os.path.join(dist_dir, item)
        d = os.path.join(assets_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    # Patch index.html so relative paths ./assets/ work inside file:///android_asset/www/
    index_html_path = os.path.join(assets_dir, "index.html")
    with open(index_html_path, "r", encoding="utf-8") as f:
        html = f.read()
    html = html.replace('src="/assets/', 'src="./assets/')
    html = html.replace('href="/assets/', 'href="./assets/')
    html = html.replace('src="/', 'src="./')
    html = html.replace('href="/manifest.json"', 'href="./manifest.json"')
    with open(index_html_path, "w", encoding="utf-8") as f:
        f.write(html)

    # 6. Run aapt to generate R.java
    print("[2/6] Compiling resources with aapt...")
    run(f"aapt package -f -m -J {gen_dir} -M {manifest_path} -S {res_dir} -I {android_jar}", cwd=build_dir)

    # 7. Compile Java source to class files
    print("[3/6] Compiling Java classes with javac...")
    r_java = os.path.join(gen_dir, "com", "anitaputri", "downloader", "R.java")
    run(f"javac -target 1.8 -source 1.8 -bootclasspath {android_jar} -d {obj_dir} {r_java} {main_activity_path}", cwd=build_dir)

    # 8. Convert class files to DEX
    print("[4/6] Converting bytecode to classes.dex with dalvik-exchange (dx)...")
    run(f"/usr/bin/dalvik-exchange --dex --output={os.path.join(bin_dir, 'classes.dex')} {obj_dir}", cwd=build_dir)

    # 9. Package APK with assets and resources
    print("[5/6] Packaging APK with aapt...")
    unsigned_apk = os.path.join(bin_dir, "app.unsigned.apk")
    run(f"aapt package -f -M {manifest_path} -S {res_dir} -A assets -I {android_jar} -F {unsigned_apk}", cwd=build_dir)

    # Add classes.dex into app.unsigned.apk
    run(f"aapt add app.unsigned.apk classes.dex", cwd=bin_dir)

    # 10. Zipalign & Sign
    print("[6/6] Aligning and signing APK...")
    aligned_apk = os.path.join(bin_dir, "app.aligned.apk")
    run(f"zipalign -f 4 {unsigned_apk} {aligned_apk}", cwd=build_dir)

    keystore_path = os.path.join(root_dir, "release.keystore")
    if not os.path.exists(keystore_path):
        run(f'keytool -genkeypair -v -keystore {keystore_path} -alias release -keyalg RSA -keysize 2048 -validity 10000 -storepass anitaputri -keypass anitaputri -dname "CN=Anita Putri, O=AnitaOffc, C=ID"')

    run(f"apksigner sign --ks {keystore_path} --ks-pass pass:anitaputri --key-pass pass:anitaputri --out {output_apk} {aligned_apk}", cwd=build_dir)
    run(f"apksigner verify --verbose {output_apk}", cwd=root_dir)

    apk_size = os.path.getsize(output_apk) / (1024 * 1024)
    print(f"SUCCESS! Android APK built: {output_apk} ({apk_size:.2f} MB)")

if __name__ == "__main__":
    main()
