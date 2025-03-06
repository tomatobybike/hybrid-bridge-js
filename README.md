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
  _callbacks: {},
  _handlers: {}, // 存储 H5 注册的方法
  _timeout: 5000, // 超时时间（ms）

  invoke(method, data = {}) {
    return new Promise((resolve, reject) => {
      if (typeof method !== "string") {
        reject(new Error("Method name must be a string"));
        return;
      }

      // 生成唯一 callbackId
      const callbackId = `cb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // 设定超时机制
      const timeoutTimer = setTimeout(() => {
        if (JSBridge._callbacks[callbackId]) {
          reject(new Error(`Native method ${method} timeout`));
          delete JSBridge._callbacks[callbackId];
        }
      }, JSBridge._timeout);

      // 存储回调
      JSBridge._callbacks[callbackId] = (result, error) => {
        clearTimeout(timeoutTimer); // 清除超时计时器
        if (error) {
          reject(new Error(error));
        } else {
          resolve(result);
        }
        delete JSBridge._callbacks[callbackId];
      };

      const message = { method, data, callbackId };

      try {
        if (window.webkit?.messageHandlers?.[method]) {
          // iOS 端
          window.webkit.messageHandlers[method].postMessage(message);
        } else if (window.AndroidBridge?.[method]) {
          // Android 端
          window.AndroidBridge[method](JSON.stringify(message));
        } else {
          reject(new Error(`Native method ${method} is not available`));
        }
      } catch (err) {
        reject(new Error(`JSBridge invoke error: ${err.message}`));
      }
    });
  },

  receive(callbackId, result, error = null) {
    if (JSBridge._callbacks[callbackId]) {
      JSBridge._callbacks[callbackId](result, error);
    } else {
      console.warn(`JSBridge receive warning: callbackId ${callbackId} is expired or invalid`);
    }
  },

  /**
   * 注册 H5 方法，让 Native 端可以调用
   * @param {string} method 方法名
   * @param {Function} handler 处理函数 (data, callback)
   */
  register(method, handler) {
    if (typeof method !== "string" || typeof handler !== "function") {
      console.error("JSBridge.register 参数错误");
      return;
    }
    JSBridge._handlers[method] = handler;
  },

  /**
   * 供 Native 端调用 H5 方法
   * @param {string} method 方法名
   * @param {object} data 传递的参数
   * @param {string} callbackId Native 端传递的回调 ID
   */
  call(method, data = {}, callbackId = null) {
    if (JSBridge._handlers[method]) {
      try {
        JSBridge._handlers[method](data, (result) => {
          if (callbackId) {
            // H5 处理完后，回传给 Native
            JSBridge._sendToNative(callbackId, result);
          }
        });
      } catch (err) {
        console.error(`JSBridge call error: ${err.message}`);
      }
    } else {
      console.warn(`JSBridge call warning: H5 method ${method} is not registered`);
    }
  },

  /**
   * H5 处理完后，回传给 Native
   * @param {string} callbackId Native 传递的 callbackId
   * @param {any} result 返回给 Native 的数据
   */
  _sendToNative(callbackId, result) {
    try {
      if (window.webkit?.messageHandlers?.receiveFromH5) {
        // iOS 端
        window.webkit.messageHandlers.receiveFromH5.postMessage({ callbackId, result });
      } else if (window.AndroidBridge?.receiveFromH5) {
        // Android 端
        window.AndroidBridge.receiveFromH5(JSON.stringify({ callbackId, result }));
      } else {
        console.warn("JSBridge: No receiveFromH5 method found in Native");
      }
    } catch (err) {
      console.error(`JSBridge _sendToNative error: ${err.message}`);
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

// Native 端调用这个方法，返回数据给 H5
window.JSBridge = JSBridge;



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



## **💡 使用示例**

### **🌍 1. H5 调用 Native**

```js
JSBridge.invoke("getAccessToken")
  .then((token) => console.log("H5 收到 token:", token))
  .catch((err) => console.error("H5 调用失败:", err.message));
```

#### **👉 Native 端应该这样响应**

```js


window.JSBridge.receive("cb_123456_xxxx", "abc123");
```

------

### **📲 2. H5 注册 `getUser` 方法，让 Native 可以调用**

```js
JSBridge.register("getUser", (data, callback) => {
  console.log("Native 调用了 getUser，参数:", data);
  const user = { id: 1, name: "张三" };
  callback(user); // 返回数据给 Native
});
```

#### **👉 Native 端应该这样调用**

```js


window.JSBridge.call("getUser", { userId: 1 }, "cb_7890_xxxx");
```

------

### **🚀 3. Native 端接收 H5 处理后的结果**

H5 处理完 `getUser`，会返回 `user` 对象，Native 端会收到：

```js

window.JSBridge.receive("cb_7890_xxxx", { id: 1, name: "张三" });
```

------

## **🔥 结论**

✅ **H5 -> Native** 通过 `invoke()` 发送请求，Native 用 `receive()` 接收。
✅ **Native -> H5** 通过 `call()` 触发 H5 注册的方法，H5 处理完用 `_sendToNative()` 反馈结果。
✅ **支持异步回调**，确保数据能正确返回给调用方。

这样 `JSBridge` **双向通信** 就完整了！🚀🚀🚀