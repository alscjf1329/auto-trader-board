# Profit Board

auto-trader의 매매 기록을 **HMAC-SHA256 서명**으로 검증하는 수익 인증 리더보드 + 전략 마켓플레이스.

외부 위변조·소급 입력이 기술적으로 차단됩니다.

---

## 주요 기능

- **수익 리더보드** — HMAC 서명 검증된 거래만 집계
- **유저 페이지** — 총수익·승률·거래 내역 상세
- **전략 마켓플레이스** — 전략 코드 공유·업로드·한 줄 설치
- **Docker 한 줄 배포** — `docker compose up -d`

---

## 빠른 시작

### Docker (권장)

```bash
git clone https://github.com/alscjf1329/auto-trader-board.git
cd auto-trader-board
docker compose up -d
# → http://localhost:3000
```

데이터는 `./data/trades.db` (SQLite)에 영속 저장됩니다.

### 로컬 개발

**Node.js 24 이상 필요** (`node:sqlite` 내장 모듈 사용)

```bash
npm install
npm run dev     # → http://localhost:3000
```

---

## auto-trader 연동

### 1. 유저 등록

`http://localhost:3000/register` 접속 → 유저명 입력 → `VERIFY_USER_ID`와 `VERIFY_SECRET` 발급.

Secret은 **최초 1회만 표시**됩니다. 반드시 즉시 복사하세요.

### 2. auto-trader `.env` 설정

```dotenv
VERIFY_ENDPOINT=http://localhost:3000   # 또는 배포 URL
VERIFY_USER_ID=발급받은_USER_ID
VERIFY_SECRET=발급받은_SECRET
```

이후 매매가 체결될 때마다 `verify.py`가 자동으로 서명해 전송합니다.

---

## 보안 구조

| 레이어 | 설명 |
|--------|------|
| HMAC-SHA256 서명 | `X-Signature` 헤더로 위변조 불가 |
| 타임스탬프 검증 | 5분 초과·1분 이상 미래 거절 → 소급 입력 차단 |
| Nonce 중복 체크 | 동일 논스 재전송 거절 → replay attack 방지 |
| Rate limiting | 유저당 10건/분 |
| Timing-safe 비교 | `timingSafeEqual`로 타이밍 공격 차단 |

> `is_paper` 플래그는 클라이언트가 보고합니다. 실전/모의 **자기위조**는 기술적으로 가능하나,  
> **외부 조작과 소급 입력은 완전 차단**됩니다.

---

## 전략 마켓플레이스

`/marketplace` 에서 커뮤니티 전략을 탐색하고 한 줄로 설치합니다.

### 전략 설치 (auto-trader)

```bash
# auto-trader 폴더에서
python install_strategy.py <전략ID>
```

설치 후 `settings.yaml`에 전략 이름만 추가하면 즉시 사용됩니다:

```yaml
strategy:
  name: <전략이름>
```

### 전략 등록

`/marketplace/upload` 에서 `BaseStrategy`를 상속한 Python 코드를 업로드합니다.

```python
from strategies.base import BaseStrategy

class MyStrategy(BaseStrategy):
    def get_targets(self) -> list:
        return ["005930"]

    def should_buy(self, data: dict) -> bool:
        return data["change_rate"] > 1.0

    def should_sell(self, data: dict, holding: dict) -> bool:
        return holding["profit_pct"] >= 7.0
```

---

## API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/webhook` | POST | 거래 수신 (HMAC 서명 필수) |
| `/api/register` | POST | 유저 등록 |
| `/api/marketplace` | GET | 전략 목록 |
| `/api/marketplace` | POST | 전략 업로드 |
| `/api/marketplace/[id]` | GET | 전략 상세 (코드 포함) |
| `/api/marketplace/[id]` | POST | 다운로드 카운터 증가 |

### 웹훅 페이로드 예시

```json
{
  "user_id": "abc123...",
  "nonce": "uuid-v4",
  "timestamp": "2026-06-24T09:17:00.000Z",
  "trade": {
    "action": "BUY",
    "code": "005930",
    "name": "삼성전자",
    "price": 74500,
    "qty": 3,
    "profit_pct": 0,
    "profit_amount": 0,
    "mode": "brain",
    "is_paper": false
  }
}
```

`X-Signature: <HMAC-SHA256(payload, secret) hex>`

---

## 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| DB | SQLite (`node:sqlite` 내장, 별도 설치 없음) |
| 스타일 | Tailwind CSS |
| 런타임 | Node.js 24+ |
| 배포 | Docker Compose |

---

## 환경변수

루트에 `.env.local` 생성 (`.env.local.example` 참고):

```dotenv
# SQLite DB 경로 (기본: ./data/trades.db)
DB_PATH=./data/trades.db
```

별도 설정 없이도 바로 실행됩니다.
