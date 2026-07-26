# MathSnap - 公式识别与论文精读

纯前端 AI 工具,包含两大功能:

- **公式提取**:上传或粘贴数学公式截图,AI 识别为可直接复制的 LaTeX 代码,附中文讲解与 KaTeX 实时预览。
- **论文精读**:上传 PDF 论文,自动生成结构化精读笔记;支持图表截图解析与基于原文的智能问答,历史记录保存在本地浏览器。

## BYOK(自带密钥)说明

本应用不内置任何 API Key。使用前请在页面顶部填入你自己的 [SiliconFlow API Key](https://cloud.siliconflow.cn/me/account/ak):

- 密钥仅保存在浏览器 localStorage,不会上传到任何服务器;
- 所有 AI 请求由浏览器直接发往 SiliconFlow API(`api.siliconflow.cn`)。

使用的模型(见 `services/geminiService.ts`):

| 用途 | 主模型 | 备用模型 |
| --- | --- | --- |
| 文本(精读笔记 / 问答) | deepseek-ai/DeepSeek-V3.2 | zai-org/GLM-4.6V |
| 视觉(公式 / 图表识别) | Qwen/Qwen3-VL-32B-Instruct | zai-org/GLM-4.6V |

## 本地开发

前置要求:Node.js 18+

```bash
npm install
npm run dev     # 开发服务器,默认 http://localhost:3000
npm run build   # 构建产物输出到 dist/
npm run preview # 本地预览构建产物
```

无需配置任何环境变量(API Key 由用户在页面内填写)。

## 部署

推送到主分支后由 Netlify 自动构建部署(构建命令 `npm run build`,发布目录 `dist`)。
