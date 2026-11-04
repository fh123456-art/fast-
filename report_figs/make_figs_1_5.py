# -*- coding: utf-8 -*-
"""报告图 1~5：功能结构图 / 用例图 / 顶层与一层数据流图 / 概念 ER 图。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kit import Diagram, BLUE, LBLUE, GRAY, GREEN, LGREEN, ORANGE, LORANGE, PURPLE, LPURPLE

OUT = os.path.dirname(os.path.abspath(__file__))
SUB = "#5b7fa6"


def p(name):
    return os.path.join(OUT, name)


# ---------------- 图 1 功能结构图 ----------------
def fig01():
    d = Diagram(11.0, 6.0, (0, 26), (0, 12.4), p("fig_01_function_structure.png"))
    d.box("root", 13, 11.6, "AI 智慧求职与简历优化平台", fs=11, fc="#dce9f9", pad=0.5)
    mods = [
        ("简历中心", ["上传与解析", "在线编辑", "版本与默认", "AI 诊断", "片段润色", "导出 PDF"]),
        ("岗位发现", ["条件筛选", "关键词搜索", "AI 联网搜索", "AI 智能推荐", "岗位对比", "岗位收藏"]),
        ("投递管理", ["发起投递", "状态跟踪", "求职笔记", "四态看板"]),
        ("AI 模拟面试", ["模式与难度", "逐轮出题", "即时点评", "难度自适应", "报告与重判", "错题回看"]),
        ("AI 笔试", ["自动组卷", "客观题判分", "主观题评阅", "复盘报告", "错题收藏", "错题本"]),
        ("平台治理", ["用户与配额", "内容审核", "Prompt 模板", "题库管理", "反馈与坏案例", "公告与日志"]),
    ]
    xs = [2.5, 7.1, 11.7, 15.4, 19.4, 23.6]
    for (mname, leaves), mx in zip(mods, xs):
        key = "m" + str(xs.index(mx))
        d.box(key, mx, 9.0, mname, fs=9.5, fc=LBLUE, pad=0.3)
        d.edge("root", key, head=False, color="#8aa0b6")
        for i, lf in enumerate(leaves):
            lk = key + "l" + str(i)
            d.box(lk, mx, 7.2 - i * 1.35, lf, fs=8, fc="#ffffff", ec=SUB,
                  tc="#33475b", pad=0.24)
            d.edge(key, lk, head=False, color="#8aa0b6", lw=0.9)
    d.save()


# ---------------- 图 2 用例图 ----------------
def fig02():
    d = Diagram(12.6, 7.0, (0, 19), (0, 11.2), p("fig_02_usecase.png"))
    d.frame("sys", 4.9, 1.4, 10.7, 9.0, "AI 智慧求职与简历优化平台")
    cols = {
        "A": (6.6, ["简历上传与解析", "简历编辑与版本管理", "发起 AI 诊断与润色",
                     "岗位筛选与关键词搜索", "AI 推荐与岗位匹配", "投递与状态跟踪"]),
        "B": (10.2, ["模拟面试与在线笔试", "注册与登录", "企业注册与登录",
                     "发布与维护岗位", "处理候选人投递"]),
        "C": (13.8, ["用户与配额管理", "内容审核", "Prompt 模板与题库管理",
                     "AI 反馈与坏案例处理", "统计公告与审计日志"]),
    }
    for c, (x, names) in cols.items():
        for i, nm in enumerate(names):
            d.box(c + str(i), x, 9.6 - i * 1.5, nm, shape="ellipse", fs=8,
                  fc="#ffffff", ec=SUB, tc="#2c3e50", pad=0.34)
    d.actor("stu", 2.2, 6.2, "学生")
    d.actor("hr", 11.6, 0.55, "企业 HR")
    d.actor("ad", 17.6, 6.2, "管理员")
    for i in range(6):
        d.edge("stu", "A" + str(i), head=False, color="#6b7a8f")
    d.edge("stu", "B0", head=False, color="#6b7a8f")
    d.edge("stu", "B1", head=False, color="#6b7a8f")
    for i in (2, 3, 4):
        d.edge("hr", "B" + str(i), head=False, color=GREEN)
    for i in range(5):
        d.edge("ad", "C" + str(i), head=False, color=PURPLE)
    d.text(4.95, 10.75, "三类参与者与系统边界，用例按功能族归并绘制，逐项功能说明见 2.1.1 正文",
           fs=7.5)
    d.save()


# ---------------- 图 3 顶层数据流图 ----------------
def fig03():
    d = Diagram(11.4, 6.2, (0, 17.5), (0, 9.6), p("fig_03_dfd_context.png"))
    d.box("stu", 1.9, 7.8, "学生", shape="square", fs=10, fc=LORANGE, ec=ORANGE, pad=0.5)
    d.box("hr", 1.9, 4.6, "企业 HR", shape="square", fs=10, fc=LORANGE, ec=ORANGE, pad=0.5)
    d.box("ad", 1.9, 1.4, "管理员", shape="square", fs=10, fc=LORANGE, ec=ORANGE, pad=0.5)
    d.box("sys", 8.7, 4.6, "P0", sub="AI 智慧求职与简历优化系统",
          fs=11, subfs=9.5, fc="#eaf1fb", ec=BLUE, w=6.6, h=3.0, pad=0.4)
    d.box("llm", 15.6, 7.8, "DeepSeek 大模型", sub="外部服务", fs=9, subfs=7.5,
          fc=LPURPLE, ec=PURPLE, pad=0.4)
    d.box("db", 15.6, 4.6, "MySQL 8.0", sub="19 张业务表", fs=9, subfs=7.5,
          fc="#f2f4f6", ec="#5d6d7e", pad=0.4)
    d.box("fs", 15.6, 1.4, "本地文件存储", sub="uploads/ 原始简历", fs=9, subfs=7.5,
          fc="#f2f4f6", ec="#5d6d7e", pad=0.4)
    d.edge("stu", "sys", "简历文件 / 作答内容 / 检索条件", rad=0.13)
    d.edge("sys", "stu", "诊断报告 / 面试与笔试报告", rad=0.13)
    d.edge("hr", "sys", "岗位信息", rad=0.13)
    d.edge("sys", "hr", "候选人投递列表", rad=0.13)
    d.edge("ad", "sys", "审核与配置指令", rad=0.13)
    d.edge("sys", "ad", "统计结果 / 待审内容", rad=0.13)
    d.edge("sys", "llm", "结构化提示词", rad=0.13)
    d.edge("llm", "sys", "JSON 生成结果", rad=0.13)
    d.edge("sys", "db", "读写业务数据")
    d.edge("sys", "fs", "保存与下载原始文件", rad=0.13)
    d.text(0.05, 9.35, "注：系统对 DeepSeek 的调用为同步请求—响应，对 MySQL 与文件存储为读写双向。",
           fs=7.5)
    d.save()


# ---------------- 图 4 一层数据流图 ----------------
def fig04():
    d = Diagram(11.6, 6.4, (0, 15.2), (0, 10.6), p("fig_04_dfd_level1.png"))
    rows = [
        ("P1", "简历解析与诊断", "D1", "简历与模板表", "写入解析结果与版本"),
        ("P2", "岗位检索与推荐", "D2", "岗位与收藏表", "读岗位 / 写收藏"),
        ("P3", "投递管理", "D3", "投递记录表", "读写投递与状态"),
        ("P4", "AI 模拟面试", "D4", "面试会话与逐轮表", "读写会话与逐轮问答"),
        ("P5", "AI 笔试组卷与评判", "D5", "笔试会话与题目表", "组卷快照 / 回写作答"),
        ("P6", "平台治理与审核", "D6", "反馈与审计日志表", "审核状态 / 操作留痕"),
    ]
    ys = [9.0, 7.5, 6.0, 4.5, 3.0, 1.5]
    d.box("D0", 12.4, 10.1, "D0", sub="用户与账号表", shape="store", fs=8.5, subfs=8,
          ec="#5d6d7e", tc="#2c3e50", pad=0.35)
    d.box("stu", 1.35, 6.6, "学生", shape="square", fs=9.5, fc=LORANGE, ec=ORANGE, pad=0.45)
    d.box("hr", 1.35, 3.6, "企业 HR", shape="square", fs=9.5, fc=LORANGE, ec=ORANGE, pad=0.45)
    d.box("ad", 1.35, 0.8, "管理员", shape="square", fs=9.5, fc=LORANGE, ec=ORANGE, pad=0.45)
    for (pk, pn, dk, dn, flow), y in zip(rows, ys):
        d.box(pk, 6.3, y, pk, sub=pn, fs=9, subfs=8, fc="#eaf1fb", ec=BLUE, pad=0.35)
        d.box(dk, 12.4, y, dk, sub=dn, shape="store", fs=8.5, subfs=8,
              ec="#5d6d7e", tc="#2c3e50", pad=0.35)
        d.edge(pk, dk, flow, fs=7.5, lcolor="#7f8c8d")
    for k in ("P1", "P2", "P3", "P4", "P5"):
        d.edge("stu", k, color="#6b7a8f")
    d.edge("hr", "P2", color=GREEN)
    d.edge("hr", "P3", color=GREEN)
    d.edge("ad", "P6", color=PURPLE)
    d.edge("P3", "D0", "各加工均先读 D0 做鉴权与配额校验", color="#aab7c4", lw=1.0,
           rad=0.22, fs=7.5, lcolor="#7f8c8d")
    d.text(0.05, 10.35, "注：六个加工均需先从 D0 读取账号与配额做鉴权（细线）；P1、P2、P4、P5 另与 DeepSeek 大模型发生请求—响应交互，见顶层图。",
           fs=7.5)
    d.save()


# ---------------- 图 5 概念 ER 图 ----------------
def fig05():
    d = Diagram(9.8, 6.4, (0, 10.9), (0, 9.6), p("fig_05_er.png"))
    nodes = [
        ("USERS", 1.35, 4.4, "用户"), ("ENTERPRISE", 1.75, 8.6, "企业"),
        ("RESUME", 5.0, 7.1, "简历"), ("JOB_APPLY", 5.0, 5.6, "投递"),
        ("INTERVIEW_SESSION", 6.0, 3.9, "面试会话"), ("EXAM_SESSION", 6.4, 1.9, "笔试会话"),
        ("AI_FEEDBACK", 2.2, 1.0, "AI 反馈"), ("JOB_POSITION", 8.9, 8.6, "岗位"),
        ("INTERVIEW_MESSAGE", 9.0, 3.9, "面试逐轮问答"), ("EXAM_QUESTION", 9.0, 0.9, "笔试题"),
    ]
    for k, x, y, cn in nodes:
        d.box(k, x, y, k, sub=cn, fs=9.5, subfs=8, pad=0.42)
    edges = [
        ("USERS", "RESUME", "1:n", 2.75, 5.44, 0),
        ("USERS", "JOB_APPLY", "1:n", 3.15, 4.95, 0),
        ("USERS", "INTERVIEW_SESSION", "1:n", 3.5, 4.0, 0),
        ("USERS", "EXAM_SESSION", "1:n", 3.6, 3.05, 0),
        ("USERS", "AI_FEEDBACK", "1:n", 1.82, 2.5, 0),
        ("ENTERPRISE", "JOB_POSITION", "1:n", 5.3, 8.6, 0),
        ("JOB_POSITION", "JOB_APPLY", "1:n", 6.75, 6.92, 0),
        ("JOB_POSITION", "INTERVIEW_SESSION", "1:n", 7.57, 6.18, 0.05),
        ("JOB_POSITION", "EXAM_SESSION", "1:n", 8.05, 5.1, 0.12),
        ("RESUME", "JOB_APPLY", "1:n", 5.42, 6.35, 0),
        ("INTERVIEW_SESSION", "INTERVIEW_MESSAGE", "1:n", 7.5, 3.9, 0),
        ("EXAM_SESSION", "EXAM_QUESTION", "m:n", 7.75, 1.3, 0),
    ]
    for a, b, lb, lx, ly, rad in edges:
        d.edge(a, b, lb, lx=lx, ly=ly, rad=rad, head=False)
    d.text(0.05, 9.35, "注：ai_feedback 通过 target_type + target_id 与简历、面试会话、笔试会话逻辑关联，"
                       "数据库中无物理外键，故未在图中画出", fs=7.5)
    d.save()


if __name__ == "__main__":
    for f in ("fig01", "fig02", "fig03", "fig04", "fig05"):
        try:
            globals()[f]()
        except Exception as e:
            print("FAIL", f, type(e).__name__, e)
