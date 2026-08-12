# thetree-skin-vector

the tree용 MediaWiki Vector 레거시 스킨입니다.

## 주요 기능

- MediaWiki Vector 레거시 디자인
- 데스크톱과 모바일 반응형 화면
- 밝은 화면과 어두운 화면 전환
- the tree의 문서 도구, 검색과 사용자 메뉴
- 로그인 사용자의 문서 주시 및 해제
- Skin Composer의 데스크톱·모바일 슬롯 지원

## 요구 사항

- the tree 관리자 계정의 `developer` 권한
- Node.js 20.19.1 이상과 npm 10.8.2 이상
- Git이 설치되어 있고 GitHub에 접속할 수 있는 서버
- the tree 설치 서버의 명령줄 접근 권한

## 설치

1. the tree에서 **관리자 → 개발자 설정 → 스킨**으로 이동합니다.
2. 이름에 `vector`, URL에 `https://github.com/WikinLab/thetree-skin-vector`를 입력하고 **추가**를 누릅니다.
3. the tree 설치 디렉터리에서 다음 명령을 실행합니다.

   ```sh
   cd frontend/skins/vector
   npm run bootstrap
   ```

4. 관리자 화면의 `vector` 항목에서 **빌드**를 누릅니다.
5. 관리자 설정에서 기본 스킨을 `vector`로 지정하거나 사용자 설정에서 `vector`를 선택합니다.

Vector와 Minerva를 데스크톱·모바일로 조합하려면 [`thetree-skin-composer`](https://github.com/WikinLab/thetree-skin-composer)를 설치합니다.

## 설정

| 설정 키 | 설명 | 기본값 |
| --- | --- | --- |
| `skin.vector.logo_image` | 왼쪽 위 로고의 CSS 배경 이미지. 예: `url(/img/logo.png)` | `wiki.logo_url` |
| `skin.vector.logo_title` | 로고에 마우스를 올렸을 때 표시할 문구 | 위키 이름 |
| `skin.vector.footer_html` | 푸터에 표시할 HTML | `wiki.footer_text` |
| `skin.vector.search_title` | 검색 폼의 대상 페이지 | `Special:Search` |
| `skin.vector.search_placeholder` | 검색창 안내 문구 | `검색` |
| `skin.vector.navigation_heading` | 사이드바 첫 메뉴 제목 | `둘러보기` |
| `skin.vector.theme_color` | 밝은 화면의 테마 색상 | `#eaecf0` |
| `skin.vector.tagline` | 문서 제목 아래 문구 | `From 위키 이름` |

## 업데이트

1. **관리자 → 개발자 설정 → 스킨 → vector**에서 **업데이트**를 누릅니다.
2. `frontend/skins/vector`에서 `npm run bootstrap`을 실행합니다.
3. 같은 화면에서 **빌드**를 누릅니다.

## 문제 해결

생성 파일이나 내려받은 원본 때문에 부트스트랩이 실패하면 다음 명령으로 다시 준비합니다.

```sh
npm run bootstrap -- --clean
```

Windows에서 `Filename too long` 오류가 나오면 관리자 권한 터미널에서 Git의 긴 경로 지원을 활성화한 뒤 다시 실행합니다.

```sh
git config --system core.longpaths true
```

## 버전과 라이선스

현재 버전은 `package.json`에서 확인할 수 있습니다.

이 프로젝트는 GPL-2.0-or-later로 배포됩니다. 원본과 제3자 저작권 고지는 `NOTICE`와 `THIRD_PARTY_NOTICES.md`에서 확인할 수 있습니다.
