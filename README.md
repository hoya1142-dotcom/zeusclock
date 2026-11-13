# ZEUS Boss Clock (초기 제작본)

## 현재 포함된 기능
- 다크 모드 반응형 보스 시계
- 제우스 보스 목록 (원본 공개 README에 기재된 주기 기준)
- 가까운 순 정렬 / 필드·인던·주간·일일 필터
- 컷 등록 시 다음 출현 시간 계산
- 개별 보스 다음 젠 시각 수동 설정
- 브라우저 로컬 저장
- Supabase 연결 시 실시간 공유
- 출현 3분 전 브라우저 알림(권한 및 브라우저 정책에 따라 달라짐)

## 중요: 최초 시간 설정
필드/인던 보스의 젠 주기(8시간/12시간/24시간)는 알려져 있지만,
실제 첫 다음 젠 시각은 게임 안에서 확인해야 합니다.
각 보스의 [시간 설정]을 눌러 게임에서 확인한 다음 출현 시각을 넣으세요.
주간/일일 보스는 공개 안내에 적힌 요일/시각을 기본 계산합니다.

## 로컬 미리보기
index.html 파일을 크롬/엣지로 열면 됩니다. 이 상태에서는 현재 브라우저에만 기록됩니다.

## 실시간 공유 켜기
1. https://supabase.com 에서 무료 프로젝트를 만듭니다.
2. Dashboard > SQL Editor에서 `supabase-schema.sql` 내용을 실행합니다.
3. Project Settings > API에서 Project URL과 anon/publishable key를 복사합니다.
4. 사이트 우측 상단 [설정]에서 두 값을 입력하고 [연결하기]를 누릅니다.
5. 연결 상태가 "실시간 공유 연결됨"으로 바뀌면 공유 준비가 끝납니다.

주의:
- `service_role` 또는 secret key는 브라우저에 절대 입력하지 마세요.
- 공개 쓰기 정책이므로 링크를 아는 누구나 컷 시간/젠 시각을 변경할 수 있습니다.
- 무단 변경이 걱정되면 다음 단계에서 닉네임, 변경 이력, 관리자 잠금 또는 간단한 인증을 추가하는 것을 권장합니다.
- Supabase 무료 프로젝트의 사용량/비활성 정책은 변경될 수 있습니다.

## 무료 배포 (Cloudflare Pages)
1. GitHub에 새 Public repository를 만듭니다.
2. 이 폴더의 `index.html`, `supabase-schema.sql`, `README.md`를 올립니다.
3. Cloudflare 계정에서 Workers & Pages > Create > Pages > Connect to Git을 선택합니다.
4. 저장소를 연결하고 Framework preset은 None, Build command는 비워두고 Output directory는 `/`로 설정합니다.
5. 배포 후 `https://프로젝트이름.pages.dev` 주소를 길드원에게 공유합니다.

## 데이터 참고
보스 이름/종류/주기는 참고 URL의 공개 README에 기재된 값을 바탕으로 초깃값을 구성했습니다.
게임 내 변경사항이나 서버별 차이가 있을 수 있으니 실제 운영 전에 확인하세요.
