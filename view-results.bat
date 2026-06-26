@echo off
REM Quick launcher to view simulation results
echo ========================================
echo  Opening Simulation Results
echo ========================================
echo.

SET CHARTS_DIR=network\results\charts
SET RESEARCH_DIR=network\results\research

echo Opening comparison charts...
if exist "%CHARTS_DIR%\comparison_chart.html" (
    start "" "%CHARTS_DIR%\comparison_chart.html"
    echo   - Comparison Chart opened
) else (
    echo   - comparison_chart.html not found
)

if exist "%CHARTS_DIR%\radar_comparison.html" (
    start "" "%CHARTS_DIR%\radar_comparison.html"
    echo   - Radar Chart opened
) else (
    echo   - radar_comparison.html not found
)

echo.
echo Opening research reports...
for %%f in (%RESEARCH_DIR%\comparison_matrix_*.html) do (
    start "" "%%f"
    echo   - Comparison Matrix opened
    goto :found_matrix
)
echo   - No comparison matrix found
:found_matrix

for %%f in (%RESEARCH_DIR%\ai_conclusion_*.html) do (
    start "" "%%f"
    echo   - AI Conclusion opened
    goto :found_conclusion
)
echo   - No AI conclusion found
:found_conclusion

echo.
echo Opening test results folder...
start "" "%CD%\network\results\tests"

echo.
echo ========================================
echo  All available results opened!
echo ========================================
echo.
echo If no results shown, run tests first:
echo   run-tests.bat
echo.
pause
