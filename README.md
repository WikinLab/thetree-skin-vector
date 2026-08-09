# thetree-skin-vector

the tree용 MediaWiki Vector 레거시 스킨입니다. 기본 bootstrap은 Minerva 저장소 `main`의 최신 커밋도 준비하여, 엔진에서는 하나의 `vector` 스킨으로 등록한 채 데스크톱에는 Vector를, MobileFrontend 모바일 모드에는 Minerva를 표시합니다.

## 주요 기능

- MediaWiki Vector 레거시 디자인
- 데스크톱 Vector와 모바일 Minerva 자동 전환
- 쿠키나 사용자 설정을 만들지 않는 서버측 MobileFrontend 모드 판별
- 밝은 화면과 어두운 화면 전환
- the tree의 문서 도구, 검색과 사용자 메뉴 지원
- 로그인 사용자의 문서 주시 및 해제

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
4. 스킨 설치 디렉터리에서 다음 명령을 실행합니다. Vector 준비가 끝나면 Minerva 저장소 `main`의 최신 커밋을 확인하고 Minerva의 bootstrap도 자동으로 이어서 실행합니다.

   ```bash
   npm run bootstrap
   ```

5. **관리자 → 개발자 설정 → 스킨 → vector**로 돌아가 **빌드**를 누릅니다.
6. 관리자 설정에서 기본 스킨을 `vector`로 지정하거나, 사용자 설정에서 `vector`를 선택합니다.

MediaWiki MobileFrontend에 대응하는 별도 백엔드 플러그인 `thetree-plugin-mobilefrontend`가 모바일 모드와 스킨 선택을 담당합니다. the tree의 백엔드 플러그인 폴더에 저장소 전체를 클론합니다.

```bash
cd /path/to/thetree/plugins
git clone https://github.com/WikinLab/thetree-plugin-mobilefrontend.git thetree-plugin-mobilefrontend
```

설치 위치는 백엔드의 `plugins/thetree-plugin-mobilefrontend/`입니다. 플러그인이 새로 설치되거나 바뀐 뒤에는 the tree 엔진을 다시 시작해야 합니다. 판별은 엔진의 `req.isMobile` 값만 사용하며 쿠키와 별도 사용자 설정을 만들지 않습니다. 플러그인이 없는 독립 `minerva` 스킨은 MobileFrontend가 없는 기본 Minerva로 출력되고, 플러그인이 있는 모바일 요청에서만 검색 화면·접이식 문단·모바일 기능 프로필이 활성화됩니다.

Minerva 없이 순수 Vector만 준비하려면 다음 인자를 사용합니다.

```bash
npm run bootstrap -- --vector-only
```

이 모드에서는 모바일에서도 Vector가 선택되며, Vector 자체의 모바일 지원 범위만 적용됩니다.

## 설정

기본 설정으로 바로 사용할 수 있습니다. 로고와 문구를 바꾸려면 the tree 설정에 다음 값을 지정합니다.

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

1. **관리자 → 개발자 설정 → 스킨 → vector**에서 **업데이트**를 누릅니다.
2. 스킨 설치 디렉터리에서 다음 명령을 실행합니다. 기본 동작은 Vector를 갱신하고 Minerva `main`의 최신 커밋을 해석한 뒤 각각의 bootstrap을 실행합니다.

   ```bash
   npm run bootstrap
   ```

3. 같은 화면에서 **빌드**를 누릅니다.

## 문제 해결

빌드 중 생성 파일이나 원본 파일에 관한 오류가 나오면 다음 명령으로 Vector와 Minerva의 캐시 및 생성 파일을 처음부터 다시 준비한 뒤 관리자 화면에서 다시 빌드합니다.

```bash
npm run bootstrap -- --clean
```

원본을 내려받는 과정에서 멈춘 경우에는 서버에서 GitHub에 연결할 수 있는지 확인합니다.

## 면책

이 스킨을 사용하면서 발생하는 문제에 대해서는 책임지지 않습니다.

## 개발 도구

이 프로젝트의 개발에는 OpenAI ChatGPT가 사용되었습니다.

## 버전과 라이선스

현재 버전은 `package.json`에서 확인할 수 있으며, 릴리스 태그는 `vX.Y.Z` 형식을 사용합니다.

이 프로젝트는 GPL-2.0-or-later로 배포됩니다. 원본 소스의 저작권과 라이선스는 `NOTICE`, `THIRD_PARTY_NOTICES.md`와 각 원본의 라이선스를 따릅니다.

이 스킨은 MediaWiki의 Vector 스킨과 DarkMode 확장 기능을 바탕으로 제작되었습니다.
