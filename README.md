# thetree-skin-vector

the tree용 MediaWiki Vector 레거시 스킨입니다. 이 저장소는 Vector만 제공하며 모바일 스킨 결합은 범용 `thetree-skin-composer`가 담당합니다.

## 주요 기능

- MediaWiki Vector 레거시 디자인
- 데스크톱과 모바일 반응형 화면
- 밝은 화면과 어두운 화면 전환
- the tree의 문서 도구, 검색과 사용자 메뉴 지원
- 로그인 사용자의 문서 주시 및 해제
- Composer에서 사용할 수 있는 `thetree-composable-skin/v1` 진입점

## 요구 사항

- the tree 관리자 계정의 `developer` 권한
- Node.js 20.19.1 이상과 npm 10.8.2 이상
- Git이 설치되어 있고 GitHub에 접속할 수 있는 서버
- the tree가 설치된 서버의 명령줄 접근 권한

## 설치

1. the tree에서 **관리자 → 개발자 설정**으로 이동합니다.
2. **스킨** 항목에 다음 내용을 입력합니다.
   - 이름: `vector`
   - URL: `https://github.com/WikinLab/thetree-skin-vector`
3. **추가**를 누릅니다.
4. 스킨 설치 디렉터리에서 `npm run bootstrap`을 실행합니다.
5. 관리자 화면에서 스킨을 빌드합니다.
6. 기본 스킨 또는 사용자 스킨으로 `vector`를 선택합니다.

Vector와 Minerva를 데스크톱·모바일로 조합하려면 `thetree-skin-composer`에 두 저장소를 슬롯으로 선언한 조합판을 사용합니다. 이 Vector 저장소는 MobileFrontend 플러그인이나 Minerva 저장소에 의존하지 않습니다.

## 설정

| 설정 키 | 설명 | 기본값 |
| --- | --- | --- |
| `skin.vector.logo_image` | 왼쪽 위 로고의 CSS 배경 이미지 | `wiki.logo_url` |
| `skin.vector.logo_title` | 로고에 마우스를 올렸을 때 표시할 문구 | 위키 이름 |
| `skin.vector.footer_html` | 푸터에 표시할 HTML | `wiki.footer_text` |
| `skin.vector.search_placeholder` | 검색창에 표시할 안내 문구 | `검색` |
| `skin.vector.navigation_heading` | 사이드바 첫 메뉴의 제목 | `둘러보기` |
| `skin.vector.theme_color` | 밝은 화면에서 사용할 테마 색상 | `#eaecf0` |
| `skin.vector.tagline` | 문서 제목 아래에 표시할 문구 | `From 위키 이름` |

## 업데이트

관리자 화면에서 저장소를 업데이트한 뒤 스킨 설치 디렉터리에서 `npm run bootstrap`을 실행하고 다시 빌드합니다.

생성 파일이나 원본 파일 오류가 있으면 `npm run bootstrap -- --clean`으로 다시 준비합니다.

## 버전과 라이선스

현재 버전은 `package.json`에서 확인할 수 있으며 릴리스 태그는 `vX.Y.Z` 형식입니다.

이 프로젝트는 GPL-2.0-or-later로 배포됩니다. 원본 소스의 저작권과 라이선스는 `NOTICE`, `THIRD_PARTY_NOTICES.md`와 각 원본의 라이선스를 따릅니다.
