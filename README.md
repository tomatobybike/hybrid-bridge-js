## **📌 详细流程**

H5 调用 `getAccessToken`，然后 Native 处理并返回结果的完整流程如下：

------

### **🔹 H5 代码：调用 `getAccessToken`**

```js
JSBridge.invoke("getAccessToken").then(token => {
  console.log("获取到 AccessToken:", token);
}).catch(error => {
  console.error("获取 AccessToken 失败:", error);
});
```

**调用 `JSBridge.invoke("getAccessToken")` 的时候，H5 会执行这些步骤：**

1. 生成一个唯一的 `callbackId`（例如 `"cb_1698742391"`）。
2. 通过 `window.webkit.messageHandlers.getAccessToken.postMessage`（iOS）或 `AndroidBridge.getAccessToken(json)`（Android）把请求发给 Native 端。
3. 等待 Native 端返回数据（Native 端需要把结果传回 `JSBridge.receive(callbackId, data)`）。

------

### **🔹 iOS 端代码（Swift）**

```swift
class WebViewController: UIViewController, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "getAccessToken" {
            let callbackId = (message.body as? [String: Any])?["callbackId"] as? String ?? ""
            
            // 模拟获取 AccessToken
            let accessToken = "abcdef123456"
            
            // 把数据传回 H5
            webView.evaluateJavaScript("JSBridge.receive('\(callbackId)', '\(accessToken)')", nil)
        }
    }
}
```

📌 **iOS 端注意点：**

- `callbackId` 从 `message.body` 里取出，保持和 H5 一致。
- `evaluateJavaScript("JSBridge.receive(callbackId, accessToken)", nil)` **把数据传回 H5**。

------

### **🔹 Android 端代码（Java/Kotlin）**

```java
class JSBridgeInterface {
    @JavascriptInterface
    public void getAccessToken(String json) {
        try {
            JSONObject obj = new JSONObject(json);
            String callbackId = obj.getString("callbackId");

            // 模拟获取 AccessToken
            String accessToken = "abcdef123456";

            // 回调给 H5
            String jsCode = "JSBridge.receive('" + callbackId + "', '" + accessToken + "')";
            webView.post(() -> webView.evaluateJavascript(jsCode, null));
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}
```

📌 **Android 端注意点：**

- `callbackId` 从 `json` 里取出，必须和 H5 端的 `callbackId` 一致。
- `evaluateJavascript("JSBridge.receive(callbackId, accessToken)")` **把结果传回 H5**。

------

### **🔹 H5 端代码（封装的 JSBridge）**

```js
const JSBridge = {
  callbacks: {},

  invoke(method, data = {}) {
    return new Promise((resolve, reject) => {
      const callbackId = "cb_" + Date.now(); // 生成唯一的 callbackId
      this.callbacks[callbackId] = { resolve, reject };

      // 兼容 iOS 和 Android
      if (window.webkit && window.webkit.messageHandlers[method]) {
        window.webkit.messageHandlers[method].postMessage({ callbackId, ...data });
      } else if (window.AndroidBridge && window.AndroidBridge[method]) {
        window.AndroidBridge[method](JSON.stringify({ callbackId, ...data }));
      } else {
        reject(new Error(`Native 未实现 ${method}`));
      }
    });
  },

  receive(callbackId, result) {
    if (this.callbacks[callbackId]) {
      this.callbacks[callbackId].resolve(result);
      delete this.callbacks[callbackId]; // 清理 callback
    }
  }
};
```

------

## **📌 总结**

1. **H5 端**
   - 通过 `JSBridge.invoke("getAccessToken")` 发送请求。
   - 生成 `callbackId` 并传递给 Native。
   - Native 端执行完逻辑后，H5 通过 `JSBridge.receive(callbackId, data)` 获取结果。
2. **iOS 端**
   - 监听 `getAccessToken` 方法，读取 `callbackId`。
   - 获取 `AccessToken` 后，调用 `evaluateJavaScript` 把数据回传给 H5。
3. **Android 端**
   - 监听 `getAccessToken` 方法，读取 `callbackId`。
   - 获取 `AccessToken` 后，使用 `evaluateJavascript` 把数据回传给 H5。

🚀 **这样 H5 和 Native 端就可以稳定通信了！**

```js
// Native 端调用这个方法，返回数据给 H5
window.JSBridge = JSBridge;

// 示例：获取 AccessToken
JSBridge.invoke("getAccessToken").then(token => {
  console.log("获取到的 Token:", token);
}).catch(error => {
  console.error("获取 Token 失败:", error);
});

```
### **✅ 生产环境下的用法**

#### **📌 H5 端调用 `getAccessToken`**

```js
JSBridge.invoke("getAccessToken")
  .then((token) => {
    console.log("获取到 AccessToken:", token);
  })
  .catch((error) => {
    console.error("获取 AccessToken 失败:", error);
  });
```

#### **📌 H5 端调用 `logout`**

```js
JSBridge.invoke("logout")
  .then(() => {
    console.log("退出成功");
  })
  .catch((error) => {
    console.error("退出失败:", error);
  });
```

#### **📌 Native 端（iOS / Android）如何返回数据**

##### **iOS 端（Swift）**

```swift

webView.evaluateJavaScript("JSBridge.receive('cb_1698742391', 'abcdef123456')", nil)
```

##### **Android 端（Java/Kotlin）**

```java
String jsCode = "JSBridge.receive('cb_1698742391', 'abcdef123456')";
webView.post(() -> webView.evaluateJavascript(jsCode, null));
```