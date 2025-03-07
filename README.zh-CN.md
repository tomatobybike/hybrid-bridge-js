# hybrid-bridge-js

一个用于 Web 和原生应用（iOS/Android）之间通信的 JavaScript 桥接库。

[English](./README.md) | 简体中文

## 安装

```bash
yarn add hybrid-bridge-js
```

## 使用方法

```javascript
import JSBridge from 'hybrid-bridge-js'

// 调用原生方法
JSBridge.invoke('nativeMethod', { param: 'value' })
  .then((result) => {
    console.log('Native 返回结果:', result)
  })
  .catch((error) => {
    console.error('错误:', error)
  })

// 注册 H5 方法供原生调用
JSBridge.register('webMethod', (data, callback) => {
  console.log('收到来自原生的数据:', data)
  callback({ success: true })
})
```

## API 文档

### JSBridge.invoke(method: string, data?: object): Promise

调用原生方法。

### JSBridge.register(method: string, handler: Function): void

注册 H5 方法供原生调用。

### JSBridge.receive(callbackId: string, result: any, error?: string): void

接收原生方法的回调结果。

### JSBridge.call(method: string, data?: object, callbackId?: string): void

供原生调用已注册的 H5 方法。

## 框架集成

### Vue.js

```javascript
import { onMounted } from 'vue'
import JSBridge from 'hybrid-bridge-js'

onMounted(() => {
  JSBridge.register('getUser', (data, callback) => {
    console.log('Native 调用 H5 getUser 方法，参数:', data)
    callback({
      userId: 12345,
      nickname: '张三',
      token: 'abcd1234xyz'
    })
  })
})
```

### React

```javascript
import { useEffect } from 'react'
import JSBridge from 'hybrid-bridge-js'

useEffect(() => {
  JSBridge.register('getUser', (data, callback) => {
    console.log('Native 调用 H5 getUser 方法，参数:', data)
    callback({
      userId: 12345,
      nickname: '张三',
      token: 'abcd1234xyz'
    })
  })
}, [])
```

## 原生端实现示例

### iOS (Swift)

```swift
class WebViewController: UIViewController, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "getAccessToken" {
            let callbackId = (message.body as? [String: Any])?["callbackId"] as? String ?? ""
            let accessToken = "abcdef123456"
            webView.evaluateJavaScript("JSBridge.receive('\(callbackId)', '\(accessToken)')", nil)
        }
    }
}
```

### Android (Java/Kotlin)

```java
class JSBridgeInterface {
    @JavascriptInterface
    public void getAccessToken(String json) {
        try {
            JSONObject obj = new JSONObject(json);
            String callbackId = obj.getString("callbackId");
            String accessToken = "abcdef123456";
            String jsCode = "JSBridge.receive('" + callbackId + "', '" + accessToken + "')";
            webView.post(() -> webView.evaluateJavascript(jsCode, null));
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}
```

## 开源协议

MIT
