const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = classCode.trim();
    if (!code) return;

    const exists = await checkClassExists(code);
    if (exists) {
      setError(`Class code "${code}" is already taken by another teacher.`);
      return;
    }

    await createClass(code);
    localStorage.setItem('better-math:active-teacher', JSON.stringify({ classCode: code }));
    navigate(`/teacher/${code}`);
  };
