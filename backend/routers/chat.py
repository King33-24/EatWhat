"""POST /api/chat — 代理前端消息到 OpenClaw Agent，实现嵌入式苏格拉底对话。"""
import json
import subprocess
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from logger import log

router = APIRouter()

OPENCLAW_BIN = "openclaw"


class ChatPayload(BaseModel):
    message: str
    session_id: Optional[str] = None   # 传入上一轮返回的 session_id 以保持上下文
    context: Optional[str] = None       # 书架 contrast_card 等背景信息，首轮可带入


class ChatResponse(BaseModel):
    reply: str
    session_id: str


@router.post("/chat")
def chat(payload: ChatPayload):
    """将前端消息转发给 OpenClaw Agent（--local 模式），返回 Agent 回复。"""
    # 第一轮携带书架上下文时，把 context 拼进消息
    message = payload.message
    if payload.context and not payload.session_id:
        message = (
            f"[背景信息：以下是用户正在阅读的平行书架内容]\n{payload.context}\n\n"
            f"[用户说：]{payload.message}"
        )

    cmd = [
        OPENCLAW_BIN,
        "agent",
        "--local",
        "--agent", "main",
        "--message", message,
        "--json",
        "--timeout", "60",
    ]
    # 后续轮次传入 session_id 保持对话上下文
    if payload.session_id:
        cmd += ["--session-id", payload.session_id]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=90,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail={"success": False, "data": None, "error": "Agent 响应超时"})

    if result.returncode != 0:
        log(source="backend", level="ERROR", message="OpenClaw 调用失败", context={"stderr": result.stderr[:300]})
        raise HTTPException(status_code=500, detail={"success": False, "data": None, "error": "Agent 调用失败，请检查 OpenClaw 是否运行"})

    try:
        data = json.loads(result.stdout)
        reply = data["payloads"][0]["text"]
        session_id = data["meta"]["agentMeta"]["sessionId"]
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        raise HTTPException(status_code=500, detail={"success": False, "data": None, "error": f"响应解析失败: {e}"})

    log(source="backend", level="INFO", message="聊天代理成功", context={"session_id": session_id})
    return {
        "success": True,
        "data": {"reply": reply, "session_id": session_id},
        "error": None,
    }
