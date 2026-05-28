# SUB2API Identity Patcher

一个很小的 Chrome / Edge 插件，用来修复 `gpt_sub2api*.json` 导出文件里因为 `chatgpt_account_id` 相同导致的 SUB2API / 中转站导入 409 问题。

## 它做什么

插件会在浏览器本地读取 JSON，遍历 `accounts` 数组里的全部账号，不限制账号条数。

对每一条账号，它会把：

```json
credentials.chatgpt_account_id
```

改成同一条账号自己的：

```json
credentials.chatgpt_user_id
```

并默认在 `extra.original_chatgpt_account_id` 里保留原始值。

## 适用场景

当导入中转站时报错类似：

```text
code=409 reason="OWNED_ACCOUNT_ALREADY_EXISTS"
identity:openai.chatgpt_account_id
```

并且导出的多个账号实际是同一个 Team / Workspace 下的不同邮箱时，可以用这个工具生成可导入副本。

## 隐私

- 不需要网络权限。
- 不上传文件。
- 所有处理都在浏览器本地完成。
- 原始 JSON 不会被修改，只会下载一个新文件。

## 安装

1. 下载本仓库源码。
2. 打开 Chrome / Edge 的扩展管理页。
3. 开启“开发者模式”。
4. 选择“加载已解压的扩展程序”。
5. 选择本仓库目录。

## 使用

1. 点击浏览器工具栏里的插件图标。
2. 选择或拖入 `gpt_sub2api*.json`。
3. 点击“修复并下载”。
4. 使用下载出来的 `*_user_identity_import.json` 导入中转站。

## 注意

如果你的中转站后端不是读取 JSON 字段，而是强制解析 token 里的真实身份再判重，这个补丁可能仍然会遇到 409。那种情况下需要调整中转站后端的判重逻辑，或先删除/更新已有账号。

## 发布到 GitHub

这个目录本身就是一个完整仓库内容。新建 GitHub 仓库后，把这些文件推上去即可：

```bash
git init
git add .
git commit -m "Initial release"
git branch -M main
git remote add origin https://github.com/<your-name>/sub2api-identity-patcher.git
git push -u origin main
```

## License

MIT
