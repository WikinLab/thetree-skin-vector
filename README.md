# thetree-skin-vector

the tree용 MediaWiki Vector 레거시 스킨의 프로젝션 배포판입니다.

## 주요 기능

- MediaWiki Vector 레거시 디자인
- 데스크톱과 모바일 화면 지원
- 밝은 화면과 어두운 화면 전환
- the tree의 문서 도구, 검색과 사용자 메뉴 지원
- MediaWiki 형식의 문서 본문
- 문서 링크와 각주 미리보기

## 요구 사항

- the tree 관리자 계정의 `developer` 권한
- Node.js 20.19.1 이상과 npm 10.8.2 이상
- Git이 설치되어 있고 GitHub에 접속할 수 있는 서버
- the tree가 설치된 서버의 명령줄 접근 권한

## 설치

1. the tree에서 **관리자 → 개발자 설정**으로 이동합니다.
2. **스킨** 항목에 다음 내용을 입력합니다.
   - 이름: `vector`
   - URL: 프로젝션 배포 저장소의 Git URL
3. **추가**를 누릅니다.
4. the tree 설치 디렉터리에서 다음 명령을 실행합니다.

   ```bash
   cd frontend/skins/vector
   npm run bootstrap
   ```

5. **관리자 → 개발자 설정 → 스킨 → vector**로 돌아가 **빌드**를 누릅니다.
6. 관리자 설정에서 기본 스킨을 `vector`로 지정하거나, 사용자 설정에서 `vector`를 선택합니다.

## 본문 표시 방식

프로젝션 본문이 기본으로 표시됩니다. 개인 도구에서 **스킨 본문 끄기**를 선택하면 the tree의 원래 본문으로 바뀌고, **스킨 본문 켜기**를 선택하면 프로젝션 본문으로 돌아갑니다. 선택한 방식은 브라우저에 저장됩니다.

## 설정

기본 설정으로 바로 사용할 수 있습니다. 로고와 문구를 바꾸려면 the tree 설정에 다음 값을 지정합니다.

| 설정 키 | 설명 | 기본값 |
| --- | --- | --- |
| `wiki.logo_url` | 왼쪽 위에 표시할 로고 이미지 주소 | 없음 |
| `skin.vector.logo_title` | 로고에 마우스를 올렸을 때 표시할 문구 | 위키 이름 |
| `skin.vector.footer_html` | 푸터에 표시할 HTML | `wiki.footer_text` |
| `skin.vector.search_placeholder` | 검색창에 표시할 안내 문구 | `검색` |
| `skin.vector.navigation_heading` | 사이드바 첫 메뉴의 제목 | `둘러보기` |
| `skin.vector.theme_color` | 밝은 화면에서 사용할 테마 색상 | `#eaecf0` |
| `skin.vector.tagline` | 문서 제목 아래에 표시할 문구 | `From 위키 이름` |

## 업데이트

1. **관리자 → 개발자 설정 → 스킨 → vector**에서 **업데이트**를 누릅니다.
2. the tree 설치 디렉터리에서 다음 명령을 실행합니다.

   ```bash
   cd frontend/skins/vector
   npm run bootstrap
   ```

3. 같은 화면에서 **빌드**를 누릅니다.

## 문제 해결

빌드 중 생성 파일이나 원본 파일에 관한 오류가 나오면 다음 명령으로 필요한 파일을 처음부터 다시 준비한 뒤 관리자 화면에서 다시 빌드합니다.

```bash
cd frontend/skins/vector
npm run bootstrap -- --clean
```

원본을 내려받는 과정에서 멈춘 경우에는 서버에서 GitHub에 연결할 수 있는지 확인합니다.

## 버전과 라이선스

현재 버전은 `package.json`에서 확인할 수 있으며, 릴리스 태그는 `projection-vX.Y.Z` 형식을 사용합니다.

이 프로젝트는 GPL-2.0-or-later로 배포됩니다. 원본 소스의 저작권과 라이선스는 `NOTICE`, `THIRD_PARTY_NOTICES.md`와 각 원본의 라이선스를 따릅니다.

이 스킨은 MediaWiki의 Vector 스킨, DarkMode·Popups·Cite·TextExtracts 확장 기능을 바탕으로 제작되었습니다.
