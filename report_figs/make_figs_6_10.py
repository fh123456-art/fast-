# -*- coding: utf-8 -*-
"""报告图 6~10：系统架构 / 智能体路由 / 简历、面试、笔试三条业务流程。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kit import (Diagram, BLUE, LBLUE, GRAY, GREEN, LGREEN, ORANGE, LORANGE,
                  PURPLE, LPURPLE, RED)

OUT = os.path.dirname(os.path.abspath(__file__))
SUB = "#5b7fa6"


def p(name):
    return os.path.join(OUT, name)


def band(d, key, x, y, w, h, title):
    d.frame(key, x, y, w, h, title, ec="#b7c3d0")


# ---------------- 图 6 系统总体架构图 ----------------
def fig06():
    d = Diagram(12.2, 7.4, (0, 19), (0, 13.6), p("fig_06_architecture.png"))
    rows = [
        ("客户端层", 12.0, [
            ("index.html", "岗位/简历/面试/笔试工作台"),
            ("login.html", "学生与管理员双入口"),
            ("admin.html", "审核/配额/题库/统计"),
            ("原生 HTML+CSS+JS", "无构建步骤，fetch 调 REST"),
        ]),
        ("接口层（FastAPI，前缀 /api）", 9.5, [
            ("auth", "认证"), ("resumes", "简历"), ("jobs", "岗位"),
            ("applies", "投递"), ("interviews", "面试"), ("exams", "笔试"),
            ("feedback", "反馈"), ("enterprise", "企业"), ("admin", "管理端"),
        ]),
        ("业务服务层", 7.0, [
            ("简历解析", "resume_parser"),
            ("简历诊断", "resume_diagnose"),
            ("联网搜岗", "job_search"),
            ("智能推荐", "job_recommend"),
            ("岗位匹配", "job_match"),
            ("面试服务", "interview_service"),
            ("笔试服务", "exam_generator"),
            ("导出与脱敏", "pdf_export"),
        ]),
        ("AI 编排层（LangGraph）", 4.4, [
            ("StateGraph", "条件路由，按 task 选节点"),
            ("6 个 Agent", "见多智能体路由图"),
            ("AgentState", "TypedDict 共享状态"),
            ("llm_client", "ChatDeepSeek 统一封装"),
        ]),
        ("数据与外部服务层", 1.9, [
            ("MySQL 8.0", "19 张表 / utf8mb4"),
            ("本地文件存储", "uploads/ 原始简历"),
            ("DeepSeek API", "deepseek-chat"),
            ("JWT + 配额", "ai_quota / resume_limit"),
        ]),
    ]
    for i, (title, y, items) in enumerate(rows):
        band(d, "b" + str(i), 0.3, y - 0.95, 18.4, 1.9, title)
        n = len(items)
        gap = 18.0 / n
        for j, (t, sub) in enumerate(items):
            d.box(f"n{i}_{j}", 0.8 + gap * (j + 0.5), y - 0.05, t, sub=sub, fs=8,
                  subfs=7, pad=0.16,
                  fc=[LBLUE, "#e7f0fa", LBLUE, LPURPLE, "#f2f4f6"][i],
                  ec=[BLUE, BLUE, BLUE, PURPLE, "#5d6d7e"][i],
                  tc=[BLUE, BLUE, BLUE, PURPLE, "#2c3e50"][i])
    for a, b in (("n0_1", "n1_1"), ("n1_4", "n2_4"), ("n2_5", "n3_1"),
                 ("n3_3", "n4_2"), ("n0_3", "n1_8"), ("n1_2", "n2_2"),
                 ("n2_6", "n3_3"), ("n3_1", "n4_0")):
        d.edge(a, b, head=True, color="#95a5a6", lw=1.0)
    d.text(0.3, 13.35, "注：客户端经 HTTP/JSON 调用接口层，接口层做 JWT 鉴权与配额扣减后调用服务层；"
                       "服务层通过 LangGraph 状态图驱动 Agent，Agent 统一经 llm_client 访问 DeepSeek。",
           fs=7.5)
    d.save()


# ---------------- 图 7 多智能体路由图 ----------------
def fig07():
    d = Diagram(10.6, 6.2, (0, 15.4), (0, 10.2), p("fig_07_agent_graph.png"))
    d.box("start", 1.1, 5.1, "START", shape="ellipse", fs=9.5, fc="#f2f4f6",
          ec="#5d6d7e", tc="#2c3e50", pad=0.4)
    d.box("route", 4.2, 5.1, "_route_by_task", sub="按 task 字段条件路由", shape="diamond",
          fs=8.5, subfs=8, fc=LORANGE, ec=ORANGE, tc="#8a5a00", w=4.0, h=2.6)
    agents = [
        ("parse", "resume_parser", "简历文本 → 结构化 JSON"),
        ("diagnose", "resume_diagnose", "六维加权评分与润色片段"),
        ("match", "job_match", "简历与岗位技能比对"),
        ("interview", "hr_interview", "出题 / 逐轮评价 / 报告"),
        ("exam", "exam_generator", "批量组卷与主观题评判"),
        ("job_search", "job_search", "联网搜索并归一岗位"),
    ]
    d.box("end", 14.0, 5.1, "END", shape="ellipse", fs=9.5, fc="#f2f4f6",
          ec="#5d6d7e", tc="#2c3e50", pad=0.4)
    for i, (task, name, desc) in enumerate(agents):
        y = 9.0 - i * 1.55
        d.box("a" + str(i), 9.6, y, name, sub=desc, fs=9, subfs=8, fc=LPURPLE,
              ec=PURPLE, tc=PURPLE, pad=0.3)
        d.edge("route", "a" + str(i), task, fs=7.5, lcolor=RED)
        d.edge("a" + str(i), "end", head=True, color="#95a5a6")
    d.edge("start", "route", head=True)
    d.text(0.1, 9.95, "注：一次请求只命中一个 Agent，状态沿 AgentState 单向传递；"
                      "任一 Agent 抛错则写入 error 字段，由接口层转成中文错误提示。", fs=7.5)
    d.save()


# ---------------- 通用：竖向流程 ----------------
def flow(d, items, x, y0, step, key_prefix="s", up=False):
    keys = []
    n = len(items)
    for i, it in enumerate(items):
        kind, title = it[0], it[1]
        sub = it[2] if len(it) > 2 else None
        k = key_prefix + str(i)
        keys.append(k)
        y = y0 - ((n - 1 - i) if up else i) * step
        if kind == "dec":
            d.box(k, x, y, title, sub=sub, shape="diamond", fs=8.5, subfs=7.5,
                  fc=LORANGE, ec=ORANGE, tc="#8a5a00", pad=0.25)
        elif kind == "io":
            d.box(k, x, y, title, sub=sub, fs=8.5, subfs=7.5, fc="#f2f4f6",
                  ec="#5d6d7e", tc="#2c3e50", pad=0.25)
        elif kind == "ai":
            d.box(k, x, y, title, sub=sub, fs=8.5, subfs=7.5, fc=LPURPLE,
                  ec=PURPLE, tc=PURPLE, pad=0.25)
        else:
            d.box(k, x, y, title, sub=sub, fs=8.5, subfs=7.5, fc=LBLUE,
                  ec=BLUE, pad=0.25)
    return keys


# ---------------- 图 8 简历解析与诊断流程 ----------------
def fig08():
    d = Diagram(11.2, 6.4, (0, 16.4), (0, 9.4), p("fig_08_resume_flow.png"))
    left = [
        ("io", "上传简历文件", "PDF / DOCX / TXT"),
        ("box", "校验扩展名与大小"),
        ("dec", "合法？", "否则返回中文提示"),
        ("box", "文本抽取", "pypdf / python-docx"),
        ("box", "敏感信息检测", "手机号 / 身份证 / 邮箱"),
        ("ai", "LLM 结构化抽取", "response_format=json_object"),
        ("box", "parse_json_output", "剥离代码块并容错解析"),
        ("box", "normalize_resume", "统一为嵌套结构"),
        ("io", "写入 resume 表", "content / raw_text / source_file"),
    ]
    right = [
        ("dec", "配额充足？", "ai_quota 为 0 时拒绝"),
        ("box", "前端渲染简历编辑器", "版本列表与默认版本"),
        ("ai", "发起 AI 诊断", "diagnose_resume"),
        ("ai", "六维加权评分", "完整20 量化20 匹配20 专业15 逻辑15 精简10"),
        ("box", "诊断报告", "总分 / 优点 / 不足 / 建议 / 润色片段"),
        ("box", "片段一键润色", "polish_segment"),
        ("box", "导出简历 PDF", "pdf_export 渲染模板"),
        ("box", "点赞与点踩反馈", "target_type=resume"),
    ]
    kl = flow(d, left, 4.0, 8.5, 0.95, "l")
    kr = flow(d, right, 12.4, 8.5, 0.95, "r", up=True)
    for i in range(len(kl) - 1):
        d.edge(kl[i], kl[i + 1])
    for i in range(len(kr) - 1):
        d.edge(kr[i], kr[i + 1])
    d.edge(kl[8], kr[0], "解析完成，进入简历工作台")
    d.text(0.05, 9.2, "注：送入模型的简历文本按长度截断，敏感信息命中只做提示、不阻断流程；"
                      "解析与诊断是两次独立的模型调用，各自计入配额。", fs=7.5)
    d.save()


# ---------------- 图 9 模拟面试流程 ----------------
def fig09():
    d = Diagram(11.2, 6.4, (0, 16.4), (0, 9.4), p("fig_09_interview_flow.png"))
    left = [
        ("box", "选择岗位 / 模式 / 难度", "hr · tech · behavioral · mock"),
        ("box", "创建 interview_session", "status=ongoing"),
        ("ai", "生成首题", "next_question(job, mode, difficulty, history[-6:])"),
        ("box", "展示题目与难度徽标"),
        ("io", "候选人输入回答"),
        ("ai", "单轮评价", "score / comment / next_difficulty / is_wrong"),
        ("box", "写入 interview_message", "逐轮一行，含本轮难度"),
        ("dec", "继续下一题？"),
    ]
    right = [
        ("box", "结束面试", "status=finished"),
        ("ai", "生成整场报告", "generate_report(history)"),
        ("io", "回写会话", "score 与 report(JSON)"),
        ("box", "报告页渲染", "总分 / 优势 / 改进 / 建议"),
        ("box", "逐轮得分与点评", "含本轮难度徽标"),
        ("box", "重新评判", "复用历史问答再跑一次"),
        ("box", "错题回看", "is_wrong=true 的题目"),
        ("box", "点赞与点踩反馈", "target_type=interview"),
    ]
    kl = flow(d, left, 4.0, 8.5, 0.95, "l")
    kr = flow(d, right, 12.4, 8.5, 0.95, "r", up=True)
    for i in range(len(kl) - 1):
        d.edge(kl[i], kl[i + 1])
    for i in range(len(kr) - 1):
        d.edge(kr[i], kr[i + 1])
    d.edge(kl[7], kl[2], "是：按新难度出下一题", rad=0.3, fs=7.5)
    d.edge(kl[7], kr[0], "否：结束面试")
    d.text(0.05, 9.2, "注：对话历史只取最近 6 轮参与出题，每轮难度单独落库，复盘时可还原升降过程；"
                      "报告与逐轮评价是两类不同的提示词。", fs=7.5)
    d.save()


# ---------------- 图 10 笔试流程 ----------------
def fig10():
    d = Diagram(11.2, 6.4, (0, 16.4), (0, 9.4), p("fig_10_exam_flow.png"))
    left = [
        ("box", "选择岗位 / 难度 / 题量"),
        ("box", "创建 exam_session", "status=ongoing"),
        ("ai", "批量组卷", "batch_generate(count, difficulty)"),
        ("io", "写入 exam_session_question", "按 seq 保存题目快照"),
        ("box", "逐题作答"),
        ("box", "客观题即时判分", "single / multiple 作答后立即比对"),
        ("box", "主观题暂存", "code / qa 交卷后统一评判"),
    ]
    right = [
        ("box", "结束并交卷", "status=finished"),
        ("ai", "AI 批量评判主观题", "按 seq 对齐题号与答案"),
        ("box", "汇总得分", "correct_count 与 score"),
        ("io", "回写判分结果", "user_answer / is_correct / score"),
        ("box", "生成复盘报告", "薄弱点与逐题解析"),
        ("box", "重新评判", "整卷再判一次"),
        ("box", "错题收藏与错题本", "is_collected 标记"),
        ("box", "答完继续下一题", "循环作答"),
    ]
    kl = flow(d, left, 4.0, 8.5, 0.95, "l")
    kr = flow(d, right, 12.4, 8.5, 0.95, "r", up=True)
    for i in range(len(kl) - 1):
        d.edge(kl[i], kl[i + 1])
    for i in range(len(kr) - 1):
        d.edge(kr[i], kr[i + 1])
    d.edge(kl[6], kr[0], "交卷")
    d.text(0.05, 9.2, "注：组卷时把题干、选项、答案与解析整份快照进关联表，题库后续变更不影响历史试卷；"
                      "客观题在作答时即时判分，主观题在交卷后一次性批量评判。", fs=7.5)
    d.save()


if __name__ == "__main__":
    for f in ("fig06", "fig07", "fig08", "fig09", "fig10"):
        try:
            globals()[f]()
        except Exception as e:
            print("FAIL", f, type(e).__name__, e)
